const express = require("express");
const cors = require("cors");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const formidable = require("formidable");
const AWS = require("aws-sdk");
const { ChromaClient } = require("chromadb");
const Groq = require("groq-sdk");
require("dotenv").config();
const fetch = require("node-fetch");

const S3_BUCKET = process.env.S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION;
const PORT = process.env.PORT || 3200;
const MODEL_ID = process.env.RAG_MODEL_ID || "llama-3.3-70b-versatile";

const app = express();
app.use(cors());
app.use(express.json());

AWS.config.update({ region: AWS_REGION });
const s3 = new AWS.S3();

// ========== TEXT CHUNKING FUNCTION ========== //
function chunkText(text, chunkSize = 1500, overlap = 200) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.substring(start, end).trim();
    
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    start += (chunkSize - overlap);
    
    if (start >= text.length) break;
  }
  
  return chunks.length > 0 ? chunks : [text];
}

class NoopEmbeddingFunction {
  async generate(texts) {
    return texts.map(() => Array(768).fill(0));
  }
}

const chroma = new ChromaClient({
  host: "localhost",
  port: 8000,
  ssl: false,
});
const collectionName = "documents";

let collection;
(async () => {
  try {
    collection = await chroma.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: new NoopEmbeddingFunction(),
      metadata: { "hnsw:space": "cosine" },
    });

    console.log("ChromaDB collection ready:", collectionName);
  } catch (err) {
    console.error("ChromaDB initialization error:", err);
  }
})();

// ----------- File Upload and Index Route ----------- //
app.post("/api/documents", (req, res) => {
  const form = formidable({ multiples: false });
  form.parse(req, async (err, fields, files) => {
    try {
      if (err || !files.file)
        return res.status(400).json({ error: "Missing file" });
      const fileObj = files.file;
      const buffer = fs.readFileSync(fileObj.path);
      const ext = (fileObj.name.split(".").pop() || "").toLowerCase();

      // 1. Upload to S3
      const s3Key = `uploads/${Date.now()}_${fileObj.name.replace(
        /\s+/g,
        "_"
      )}`;
      await s3
        .upload({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: buffer,
          ContentType: fileObj.mimetype || fileObj.type,
        })
        .promise();

      // 2. Extract text for embedding
      let text = "";
      if (ext === "pdf") {
        text = (await pdfParse(buffer)).text;
      } else if (
        ext === "md" ||
        ext === "txt" ||
        !fileObj.mimetype ||
        /^text/.test(fileObj.mimetype)
      ) {
        text = buffer.toString("utf-8");
      } else {
        text = "[Binary file]; indexing skipped";
      }

      // 3. Chunk the text
      const chunks = chunkText(text, 1500, 200);
      console.log(`Created ${chunks.length} chunks for ${fileObj.name}`);

      // 4. Generate embeddings and store each chunk
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await getEmbedding(chunks[i]);
        const chunkId = `${s3Key}#chunk${i}`;
        
        await collection.add({
          ids: [chunkId],
          embeddings: [embedding],
          metadatas: [{
            title: fileObj.name,
            s3Key,
            chunkIndex: i,
            totalChunks: chunks.length
          }],
          documents: [chunks[i]],
        });
      }

      res.json({
        id: s3Key,
        s3Url: `s3://${S3_BUCKET}/${s3Key}`,
        filename: fileObj.name,
        chunksCreated: chunks.length
      });
    } catch (error) {
      console.error("Upload/Index error:", error);
      res.status(500).json({ error: error.message });
    }
  });
});

// ----------- List Documents from S3 ----------- //
app.get("/api/documents", async (req, res) => {
  try {
    const data = await s3
      .listObjectsV2({ Bucket: S3_BUCKET, Prefix: "uploads/" })
      .promise();
    const docs = (data.Contents || []).map((obj) => ({
      key: obj.Key,
      url: `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${obj.Key}`,
      name: obj.Key.split("/").pop(),
      lastModified: obj.LastModified,
      size: obj.Size,
    }));
    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------- RAG Chat: Query via Groq, Retrieve from Chroma ----------- //
app.post('/api/chat', async (req, res) => {
  try {
    const { query } = req.body;
    
    // 1. Detect greetings
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon'];
    if (greetings.some(g => query.toLowerCase().includes(g))) {
      return res.json({
        success: true,
        answer: "Hello! I'm your document assistant. I can help you find information from your company policies and documents. What would you like to know?",
        sources: []
      });
    }
    
    // 2. Perform RAG retrieval
    const embedding = await getEmbedding(query);
    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: 10
    });
    
    // 3. Check if relevant documents found (similarity threshold)
    const hasRelevantDocs = results.distances && results.distances[0] && 
                            results.distances[0].some(d => d < 0.7); // Adjust threshold
    
    if (!hasRelevantDocs || !results.documents[0] || results.documents[0].length === 0) {
      // 4. Fallback to general knowledge
      const generalAnswer = await getGeneralAnswer(query);
      return res.json({
        success: true,
        answer: `⚠️ This information was not found in your documents.\n\nGeneral answer: ${generalAnswer}`,
        sources: []
      });
    }
    
    // 5. Standard RAG response
    const context = results.documents.flat().join('\n\n---\n\n').slice(0, 8000);
    const answer = await runGroqRAG(query, context);
    
    // Extract sources
    const uniqueSources = new Map();
    if (results.metadatas && results.metadatas[0]) {
      results.metadatas[0].forEach(meta => {
        if (!uniqueSources.has(meta.s3Key)) {
          uniqueSources.set(meta.s3Key, 
            `${meta.title || 'Unknown'}|${meta.s3Key || ''}|${meta.department || ''}`
          );
        }
      });
    }
    
    res.json({ 
      success: true,
      answer,
      sources: Array.from(uniqueSources.values())
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// General knowledge fallback using Groq without context
async function getGeneralAnswer(question) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const chat = await groq.chat.completions.create({
    messages: [{ 
      role: "user", 
      content: `Answer this question concisely: ${question}` 
    }],
    model: MODEL_ID,
    max_tokens: 256,
    temperature: 0.5
  });
  
  return chat.choices[0]?.message?.content || "I couldn't find an answer.";
}

// ----------- Utility: Embedding ----------- //
async function getEmbedding(text) {
  if (!text || text.trim().length === 0) {
    return Array(768).fill(0);
  }

  try {
    const response = await fetch("http://localhost:11434/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "nomic-embed-text",
        prompt: text.slice(0, 2048),
      }),
    });

    const data = await response.json();
    return data.embedding;
  } catch (err) {
    console.error("Embedding error:", err.message);
    return Array(768).fill(0);
  }
}

// ----------- Utility: Groq RAG Generation ----------- //
async function runGroqRAG(question, context) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const prompt = `You are a helpful assistant answering questions based on the provided context.

Context:
${context}

User Question: ${question}

Instructions:
- Answer based ONLY on the provided context
- If the context doesn't contain the answer, say "The provided context does not contain information about this."
- Be specific and cite relevant details from the context
- Keep answers clear and concise

Answer:`;

  const chat = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL_ID,
    max_tokens: 512,
    temperature: 0.3  // Lower temperature for more factual responses
  });
  
  return chat.choices[0]?.message?.content || "No answer generated.";
}

app.get("/api/health", async (req, res) => {
  try {
    const collections = await chroma.listCollections();
    res.json({
      status: "ok",
      chroma: "connected",
      collections: collections.map((c) => c.name),
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ----------- Index Single Document from S3 ----------- //
app.post('/api/index', async (req, res) => {
  try {
    const { s3Key } = req.body;
    
    if (!s3Key) {
      return res.status(400).json({ error: 'Missing s3Key' });
    }
    
    console.log(`Indexing document: ${s3Key}`);
    
    // Download file from S3
    const file = await s3.getObject({ Bucket: S3_BUCKET, Key: s3Key }).promise();
    const buffer = file.Body;
    
    // Extract text
    let text = '';
    const ext = s3Key.split('.').pop().toLowerCase();
    
    if (ext === 'pdf') {
      text = (await pdfParse(buffer)).text;
    } else if (ext === 'md' || ext === 'txt') {
      text = buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }
    
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ error: 'No text extracted from document' });
    }
    
    // Extract metadata
    const department = s3Key.split('/')[0];
    const title = s3Key.split('/').pop();
    
    // Chunk the text
    const chunks = chunkText(text, 1500, 200);
    console.log(`Created ${chunks.length} chunks for ${title}`);
    
    // Store each chunk with embedding
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await getEmbedding(chunks[i]);
      const chunkId = `${s3Key}#chunk${i}`;
      
      await collection.add({
        ids: [chunkId],
        embeddings: [embedding],
        metadatas: [{
          title,
          s3Key,
          department,
          chunkIndex: i,
          totalChunks: chunks.length,
          lastModified: new Date().toISOString()
        }],
        documents: [chunks[i]]
      });
    }
    
    console.log(`✓ Indexed: ${s3Key} (${chunks.length} chunks)`);
    
    res.json({ 
      success: true,
      message: 'Document indexed successfully',
      s3Key,
      chunksCreated: chunks.length
    });
  } catch (err) {
    console.error('Index error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
