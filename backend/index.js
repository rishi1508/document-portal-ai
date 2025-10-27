const express = require("express");
const cors = require("cors");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const formidable = require("formidable");
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const Groq = require("groq-sdk");
require("dotenv").config();
const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");
const { QdrantClient } = require("@qdrant/js-client-rest");

const S3_BUCKET = process.env.S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION;
const PORT = process.env.PORT || 3200;
const MODEL_ID = process.env.RAG_MODEL_ID || "llama-3.3-70b-versatile";
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_VECTOR_SIZE = parseInt(process.env.QDRANT_VECTOR_SIZE || "768", 10);
const QDRANT_DISTANCE = process.env.QDRANT_DISTANCE || "Cosine";

// Map knowledge base IDs to Qdrant collections
const KB_TO_COLLECTION = {
  'common-policies': 'kb_common',
  'devops': 'kb_devops',
  'platform-engineering': 'kb_platform',
  'product-management': 'kb_product',
  'solution-analysts': 'kb_solution',
};

// Map S3 prefix to collection
const getCollectionForKB = (kbId) => {
  return KB_TO_COLLECTION[kbId] || 'kb_common';
};

const app = express();
app.use(cors());
app.use(express.json());

const s3Client = new S3Client({ region: AWS_REGION });

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

function chunkText(text, chunkSize = 1500, overlap = 200) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.substring(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    start += chunkSize - overlap;
    if (start >= text.length) break;
  }
  return chunks.length > 0 ? chunks : [text];
}

// Ensure Qdrant collection exists for a specific KB
async function ensureQdrantCollection(collectionName) {
  try {
    await qdrant.getCollection(collectionName);
    console.log(`Qdrant collection "${collectionName}" exists`);
  } catch (err) {
    console.log(`Creating Qdrant collection "${collectionName}"...`);
    await qdrant.createCollection(collectionName, {
      vectors: {
        size: QDRANT_VECTOR_SIZE,
        distance: QDRANT_DISTANCE,
      },
    });
    console.log(`✓ Qdrant collection "${collectionName}" created`);
  }
}

// Ensure s3Key field index exists for filtering
async function ensureS3KeyIndex(collectionName) {
  try {
    await qdrant.createPayloadIndex(collectionName, {
      field_name: "s3Key",
      field_schema: "keyword"
    });
    console.log(`✓ s3Key index created for "${collectionName}"`);
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log(`✓ s3Key index already exists for "${collectionName}"`);
    } else {
      console.error(`Warning: Could not create s3Key index for "${collectionName}":`, err.message);
    }
  }
}

// Initialize all collections on startup
async function initializeAllCollections() {
  try {
    console.log('Initializing Qdrant collections...\n');
    
    for (const [kbId, collectionName] of Object.entries(KB_TO_COLLECTION)) {
      await ensureQdrantCollection(collectionName);
      await ensureS3KeyIndex(collectionName);
    }
    
    console.log('\n✓ All collections initialized\n');
  } catch (err) {
    console.error("Qdrant initialization error:", err);
  }
}

// Initialize all collections on startup
initializeAllCollections();

// ----------- File Upload and Index Route ----------- //
app.post("/api/documents", (req, res) => {
  const form = formidable({
    multiples: false,
    maxFileSize: MAX_FILE_SIZE_BYTES,
  });
  form.parse(req, async (err, fields, files) => {
    try {
      if (err || !files.file)
        return res.status(400).json({ error: "Missing file" });
      const fileObj = files.file;
      if (fileObj.size > MAX_FILE_SIZE_BYTES)
        return res.status(413).json({ error: "File exceeds 8MB limit" });
      const buffer = fs.readFileSync(fileObj.path);
      const ext = (fileObj.name.split(".").pop() || "").toLowerCase();

      // 1. Upload to S3
      const s3Key = `uploads/${Date.now()}_${fileObj.name.replace(/\s+/g, "_")}`;
      await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: fileObj.mimetype || fileObj.type,
      }));

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
      let insertCount = 0;

      // Determine collection based on s3Key prefix
      const kbId = s3Key.split('/')[0];
      const collectionName = getCollectionForKB(kbId);
      await ensureQdrantCollection(collectionName);

      // 4. Generate embeddings and upsert to Qdrant
      for (let i = 0; i < chunks.length; i++) {
        try {
          const embedding = await getEmbedding(chunks[i]);
          const pointId = uuidv4();

          await qdrant.upsert(collectionName, {
            wait: true,
            points: [
              {
                id: pointId,
                vector: embedding,
                payload: {
                  text: chunks[i],
                  title: fileObj.name,
                  s3Key,
                  chunkIndex: i,
                  totalChunks: chunks.length,
                },
              },
            ],
          });
          insertCount++;
          console.log(`Upserted chunk ${i + 1}/${chunks.length} to ${collectionName}`);
        } catch (err) {
          console.error(`Chunk upsert failed for chunk ${i}:`, err.message);
        }
      }

      res.json({
        id: s3Key,
        s3Url: `s3://${S3_BUCKET}/${s3Key}`,
        filename: fileObj.name,
        chunksCreated: insertCount,
      });
    } catch (error) {
      console.error("Upload/Index error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
});

// ----------- List Documents from S3 ----------- //
app.get("/api/documents", async (req, res) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: "uploads/"
    });
    const data = await s3Client.send(command);

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

// ----------- RAG Chat with Conversation History ----------- //
app.post("/api/chat", async (req, res) => {
  try {
    const { query, conversationHistory = [], kbId = 'common-policies' } = req.body;
    
    // Get collection for this KB
    const collectionName = getCollectionForKB(kbId);
    console.log(`Chat query for KB: ${kbId} → Collection: ${collectionName}`);

    // 1. Detect greetings
    const greetings = ["hi", "hello", "hey", "good morning", "good afternoon"];
    if (greetings.some((g) => query.toLowerCase().includes(g)) && conversationHistory.length === 0) {
      return res.json({
        success: true,
        answer:
          "Hello! I'm your document assistant. I can help you find information from your company policies and documents. What would you like to know?",
        sources: [],
      });
    }

    // 2. Perform RAG retrieval from Qdrant
    await ensureQdrantCollection(collectionName);
    const queryEmbedding = await getEmbedding(query);

    const searchResults = await qdrant.search(collectionName, {
      vector: queryEmbedding,
      limit: 3,
      with_payload: true,
      with_vector: false,
    });

    // Check relevance threshold
    const hasRelevantDocs = searchResults.some((r) => r.score >= 0.3);

    if (!hasRelevantDocs || searchResults.length === 0) {
      // Fallback with conversation context
      const conversationalAnswer = await getConversationalAnswer(query, conversationHistory);
      return res.json({
        success: true,
        answer: `⚠️ This information was not found in your documents.\n\n${conversationalAnswer}`,
        sources: [],
      });
    }

    // 3. Standard RAG response with conversation history
    const context = searchResults
      .map((r) => r.payload?.text || "")
      .filter(Boolean)
      .join("\n\n---\n\n")
      .slice(0, 6000);

    const answer = await runGroqRAGWithHistory(query, context, conversationHistory);

    // Extract sources
    const uniqueSources = new Map();
    searchResults.forEach((r) => {
      const payload = r.payload || {};
      if (payload.s3Key && !uniqueSources.has(payload.s3Key)) {
        uniqueSources.set(
          payload.s3Key,
          `${payload.title || "Unknown"} | ${payload.s3Key.split('/')[0] || "Unknown"}`
        );
      }
    });

    res.json({
      success: true,
      answer,
      sources: Array.from(uniqueSources.values()),
    });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Conversational answer without documents but with history
async function getConversationalAnswer(question, conversationHistory) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const cleanHistory = (conversationHistory || [])
    .slice(-4)
    .filter(msg => msg && msg.role && msg.content && typeof msg.content === 'string')
    .filter(msg => msg.content.length < 2000);
  
  const messages = [];
  
  cleanHistory.forEach(msg => {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content.trim()
    });
  });
  
  messages.push({
    role: 'user',
    content: question.trim()
  });

  const chat = await groq.chat.completions.create({
    messages,
    model: MODEL_ID,
    max_tokens: 256,
    temperature: 0.5,
  });
  
  return chat.choices[0]?.message?.content || "I couldn't find an answer.";
}

// RAG with conversation history
async function runGroqRAGWithHistory(question, context, conversationHistory) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const cleanHistory = (conversationHistory || [])
    .slice(-3)
    .filter(msg => msg && msg.role && msg.content && typeof msg.content === 'string')
    .filter(msg => msg.content.length < 2000);
  
  const messages = [];
  
  messages.push({
    role: "system",
    content: `You are a helpful assistant answering questions based on the provided context.
Context from documents:
${context}

Instructions:
- Answer based ONLY on the provided context
- If the context doesn't contain the answer, say "The provided context does not contain information about this."
- Be specific and cite relevant details from the context
- Keep answers clear and concise
- Remember previous parts of this conversation when relevant`
  });
  
  cleanHistory.forEach(msg => {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content.trim()
    });
  });
  
  messages.push({
    role: "user",
    content: question.trim()
  });

  const chat = await groq.chat.completions.create({
    messages,
    model: MODEL_ID,
    max_tokens: 512,
    temperature: 0.3,
  });

  return chat.choices[0]?.message?.content || "No answer generated.";
}

async function getGeneralAnswer(question) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const chat = await groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: `Answer this question concisely: ${question}`,
      },
    ],
    model: MODEL_ID,
    max_tokens: 256,
    temperature: 0.5,
  });
  return chat.choices[0]?.message?.content || "I couldn't find an answer.";
}

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
      timeout: 30000,
    });
    const data = await response.json();
    return data.embedding;
  } catch (err) {
    console.error("Embedding error:", err.message);
    return Array(768).fill(0);
  }
}

// Health check
app.get("/api/health", async (req, res) => {
  try {
    const collections = await qdrant.getCollections();
    res.json({
      status: "ok",
      qdrant: "connected",
      collections: collections.collections.map((c) => c.name),
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ----------- Index Single Document from S3 ----------- //
app.post("/api/index", async (req, res) => {
  try {
    const { s3Key } = req.body;
    if (!s3Key) {
      return res.status(400).json({ error: "Missing s3Key" });
    }
    console.log(`Indexing document: ${s3Key}`);

    // Download file from S3
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
    const response = await s3Client.send(command);
    const buffer = Buffer.from(await response.Body.transformToByteArray());

    // Extract text
    let text = "";
    const ext = s3Key.split(".").pop().toLowerCase();
    if (ext === "pdf") {
      text = (await pdfParse(buffer)).text;
    } else if (ext === "md" || ext === "txt") {
      text = buffer.toString("utf-8");
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ error: "No text extracted from document" });
    }

    // Extract metadata
    const department = s3Key.split("/")[0];
    const title = s3Key.split("/").pop();

    // Chunk the text
    const chunks = chunkText(text, 1500, 200);
    console.log(`Created ${chunks.length} chunks for ${title}`);
    let insertCount = 0;

    // Determine collection based on s3Key prefix
    const kbId = s3Key.split('/')[0];
    const collectionName = getCollectionForKB(kbId);
    await ensureQdrantCollection(collectionName);

    // Store each chunk with embedding in Qdrant
    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await getEmbedding(chunks[i]);
        const pointId = uuidv4();

        await qdrant.upsert(collectionName, {
          wait: true,
          points: [
            {
              id: pointId,
              vector: embedding,
              payload: {
                text: chunks[i],
                title,
                s3Key,
                department,
                chunkIndex: i,
                totalChunks: chunks.length,
                lastModified: new Date().toISOString(),
              },
            },
          ],
        });
        insertCount++;
        console.log(`Upserted chunk ${i + 1}/${chunks.length} to ${collectionName}`);
      } catch (err) {
        console.error(`Chunk upsert failed for chunk ${i}:`, err.message);
      }
    }

    console.log(`✓ Indexed: ${s3Key} (${insertCount} chunks)`);

    res.json({
      success: true,
      message: "Document indexed successfully",
      s3Key,
      chunksCreated: insertCount,
    });
  } catch (err) {
    console.error("Index error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ----------- Delete Document from S3 and Qdrant ----------- //
app.delete("/api/documents", async (req, res) => {
  try {
    const s3Key = req.query.key;
    if (!s3Key) {
      return res.status(400).json({ error: "Missing s3Key in query parameter" });
    }

    console.log(`Deleting document: ${s3Key}`);

    // 1. Delete from S3
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key
      }));
      console.log(`✓ Deleted from S3: ${s3Key}`);
    } catch (err) {
      console.error(`S3 delete failed:`, err.message);
    }

    // 2. Delete all chunks from Qdrant matching this s3Key
    let deletedCount = 0;
    try {
      // Determine collection based on s3Key prefix
      const kbId = s3Key.split('/')[0];
      const collectionName = getCollectionForKB(kbId);
      await ensureQdrantCollection(collectionName);

      console.log(`[DEBUG] Attempting Qdrant delete for s3Key: ${s3Key} in collection: ${collectionName}`);

      const scrollResult = await qdrant.scroll(collectionName, {
        filter: {
          must: [
            {
              key: "s3Key",
              match: {
                value: s3Key
              }
            }
          ]
        },
        limit: 1000,
        with_payload: false,
        with_vector: false
      });

      const pointIds = scrollResult.points.map(p => p.id);
      console.log(`[DEBUG] Found ${pointIds.length} points to delete`);

      if (pointIds.length > 0) {
        await qdrant.delete(collectionName, {
          wait: true,
          points: pointIds
        });
        deletedCount = pointIds.length;
        console.log(`✓ Deleted ${deletedCount} points from ${collectionName}`);
      } else {
        console.log(`⚠️ No Qdrant points found for s3Key=${s3Key}`);
      }
    } catch (err) {
      console.error(`[ERROR] Qdrant delete failed:`, err.message);
    }

    res.json({
      success: true,
      message: "Document deleted successfully from S3 and Qdrant",
      s3Key,
      qdrantPointsDeleted: deletedCount
    });
  } catch (err) {
    console.error("Delete error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Backend running on port", PORT);
});
