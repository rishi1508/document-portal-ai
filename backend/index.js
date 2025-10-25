const express = require("express");
const cors = require("cors");
const fs = require("fs");
const PDFParser = require("pdf-parse");
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
// For AWS credentials, rely on env vars or local AWS config/CLI setup
const s3 = new AWS.S3();

class NoopEmbeddingFunction {
  async generate(texts) {
    // This won't be called since we provide embeddings explicitly
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
        text = (await PDFParser(buffer)).text;
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

      // 3. Get embedding (for demo, random vector is used; in prod use real embedding model)
      const embedding = await getEmbedding(text);

      // 4. Store in ChromaDB with explicit embedding
      await collection.add({
        ids: [s3Key],
        embeddings: [embedding],
        metadatas: [{ title: fileObj.name, s3Key }],
        documents: [text],
      });

      res.json({
        id: s3Key,
        s3Url: `s3://${S3_BUCKET}/${s3Key}`,
        filename: fileObj.name,
      });
    } catch (error) {
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
    
    if (!query || !query.trim()) {
      return res.json({ 
        success: true,
        answer: "Please ask a question.",
        sources: []
      });
    }
    
    const embedding = await getEmbedding(query);
    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: 3
    });
    
    if (!results.documents || !results.documents[0] || results.documents[0].length === 0) {
      return res.json({ 
        success: true,
        answer: "No relevant documents found. The knowledge base may be empty.",
        sources: []
      });
    }
    
    const context = results.documents.flat().join('\n---\n').slice(0, 6000);
    const answer = await runGroqRAG(query, context);
    
    // Extract sources as strings (format: "title|s3Key|department")
    const sources = (results.metadatas && results.metadatas[0]) 
      ? results.metadatas[0].map(meta => 
          `${meta.title || 'Unknown'}|${meta.s3Key || ''}|${meta.department || ''}`
        )
      : [];
    
    res.json({ 
      success: true,
      answer,
      sources
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});


// ----------- Utility: Embedding Stub ----------- //
async function getEmbedding(text) {
  if (!text || text.trim().length === 0) {
    return Array(768).fill(0); // nomic-embed-text outputs 768-dim vectors
  }

  try {
    const response = await fetch("http://localhost:11434/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "nomic-embed-text",
        prompt: text.slice(0, 2048), // Limit input length
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
  const prompt = `Context:\n${context}\n\nUser question: "${question}"\n\nAnswer:`;
  const chat = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL_ID,
    max_tokens: 512,
  });
  return chat.choices[0]?.message?.content || "No answer.";
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
    } else if (ext === 'docx') {
      // If you have mammoth installed
      // const mammoth = require('mammoth');
      // const result = await mammoth.extractRawText({ buffer });
      // text = result.value;
      text = '[DOCX file - parser needed]';
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }
    
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ error: 'No text extracted from document' });
    }
    
    // Generate embedding
    const embedding = await getEmbedding(text.slice(0, 2048));
    
    // Extract metadata
    const department = s3Key.split('/')[0];
    const title = s3Key.split('/').pop();
    
    // Store in ChromaDB
    await collection.add({
      ids: [s3Key],
      embeddings: [embedding],
      metadatas: [{
        title,
        s3Key,
        department,
        lastModified: new Date().toISOString()
      }],
      documents: [text.slice(0, 10000)]
    });
    
    console.log(`✓ Indexed: ${s3Key}`);
    
    res.json({ 
      success: true,
      message: 'Document indexed successfully',
      s3Key
    });
  } catch (err) {
    console.error('Index error:', err);
    res.status(500).json({ error: err.message });
  }
});


app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
