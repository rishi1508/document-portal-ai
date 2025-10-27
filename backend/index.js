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
const mammoth = require("mammoth");

const S3_BUCKET = process.env.S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION;
const PORT = process.env.PORT || 3200;
const MODEL_ID = process.env.RAG_MODEL_ID || "llama-3.3-70b-versatile";
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_VECTOR_SIZE = parseInt(process.env.QDRANT_VECTOR_SIZE || "768", 10);
const QDRANT_DISTANCE = process.env.QDRANT_DISTANCE || "Cosine";

const KB_TO_COLLECTION = {
  'common-policies': 'kb_common',
  'devops': 'kb_devops',
  'platform-engineering': 'kb_platform',
  'product-management': 'kb_product',
  'solution-analysts': 'kb_solution',
};

const getCollectionForKB = (kbId) => {
  return KB_TO_COLLECTION[kbId] || 'kb_common';
};

const app = express();
app.use(cors());
app.use(express.json());

const s3Client = new S3Client({ region: AWS_REGION });
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

async function isDocumentIndexed(collectionName, s3Key) {
  try {
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
      limit: 1,
      with_payload: false,
      with_vector: false
    });

    return scrollResult.points.length > 0;
  } catch (err) {
    return false;
  }
}

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

      const s3Key = `uploads/${Date.now()}_${fileObj.name.replace(/\s+/g, "_")}`;
      await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: fileObj.mimetype || fileObj.type,
      }));

      let text = "";
      if (ext === "pdf") {
        text = (await pdfParse(buffer)).text;
      } else if (ext === "docx" || ext === "doc") {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
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

      const chunks = chunkText(text, 1500, 200);
      console.log(`Created ${chunks.length} chunks for ${fileObj.name}`);
      let insertCount = 0;

      const kbId = s3Key.split('/')[0];
      const collectionName = getCollectionForKB(kbId);
      await ensureQdrantCollection(collectionName);

      const alreadyIndexed = await isDocumentIndexed(collectionName, s3Key);
      if (alreadyIndexed) {
        console.log(`Document already indexed: ${s3Key}`);
        return res.json({
          success: true,
          message: "Document already indexed (skipped duplicate)",
          s3Key,
          chunksCreated: 0,
          skipped: true
        });
      }

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

// ----------- ENHANCED RAG Chat with Streaming ----------- //
app.post("/api/chat", async (req, res) => {
  try {
    const { query, conversationHistory = [], kbId = 'common-policies', stream = false } = req.body;

    const collectionName = getCollectionForKB(kbId);
    console.log(`Chat query for KB: ${kbId} → Collection: ${collectionName}`);

    // Detect greetings
    const greetings = ["hi", "hello", "hey", "good morning", "good afternoon"];
    if (greetings.some((g) => query.toLowerCase().includes(g)) && conversationHistory.length === 0) {
      const kbGreetings = {
        'common-policies': 'Hello! I\'m your Common Policies assistant. I can help you find information about company-wide policies, holidays, HR guidelines, and general procedures. What would you like to know?',
        'devops': 'Hello! I\'m your DevOps assistant. I can help you with deployment procedures, infrastructure guidelines, Lambda automation, and technical documentation. What can I help you with?',
        'platform-engineering': 'Hello! I\'m your Platform Engineering assistant. I can help you with platform architecture, system specifications, and engineering standards. How can I assist you?',
        'product-management': 'Hello! I\'m your Product Management assistant. I can help you with product documentation, roadmaps, and management guidelines. What would you like to know?',
        'solution-analysts': 'Hello! I\'m your Solution Analysts assistant. I can help you with solution designs, analysis documentation, and technical requirements. How can I help?',
      };
      
      return res.json({
        success: true,
        answer: kbGreetings[kbId] || 'Hello! How can I assist you today?',
        sources: [],
      });
    }

    // Perform RAG retrieval (INCREASED: topK=8, threshold=0.4)
    await ensureQdrantCollection(collectionName);
    const queryEmbedding = await getEmbedding(query);

    const searchResults = await qdrant.search(collectionName, {
      vector: queryEmbedding,
      limit: 8,  // Increased from 3
      with_payload: true,
      with_vector: false,
    });

    // Lower threshold for more results
    const hasRelevantDocs = searchResults.some((r) => r.score >= 0.4);  // Was 0.3

    if (!hasRelevantDocs || searchResults.length === 0) {
      const conversationalAnswer = await getConversationalAnswer(query, conversationHistory);
      return res.json({
        success: true,
        answer: `⚠️ This information was not found in your documents.\n\n${conversationalAnswer}`,
        sources: [],
      });
    }

    // Build context from top results
    const context = searchResults
      .map((r) => r.payload?.text || "")
      .filter(Boolean)
      .join("\n\n---\n\n")
      .slice(0, 8000);  // Increased context window

    // STREAMING MODE
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const answer = await streamGroqRAGWithHistory(query, context, conversationHistory, res, searchResults);
      
      // Send completion
      const uniqueSources = extractSources(searchResults);
      res.write(`data: ${JSON.stringify({ done: true, sources: uniqueSources })}\n\n`);
      res.end();
    } else {
      // NON-STREAMING MODE (original)
      const answer = await runGroqRAGWithHistory(query, context, conversationHistory);

      // Validate response (detect cop-outs)
      const validatedAnswer = await validateResponse(answer, query, context, conversationHistory);

      const uniqueSources = extractSources(searchResults);

      res.json({
        success: true,
        answer: validatedAnswer,
        sources: uniqueSources,
      });
    }
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Extract unique sources
function extractSources(searchResults) {
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
  return Array.from(uniqueSources.values());
}

// Validate response (detect "context does not contain" cop-outs)
async function validateResponse(answer, query, context, conversationHistory) {
  const copOuts = [
    "context does not contain",
    "provided context does not",
    "no information available",
    "documentation doesn't cover"
  ];

  const hasCopOut = copOuts.some(phrase => answer.toLowerCase().includes(phrase));

  if (hasCopOut && context.length > 100) {
    console.log("⚠️ Cop-out detected, regenerating with fallback prompt...");
    return await regenerateWithFallback(query, context, conversationHistory);
  }

  // Check numeric contradictions (e.g., "two holidays" + list 3)
  const listMatch = answer.match(/(\d+)\s+(holidays?|items?|steps?)/i);
  if (listMatch) {
    const claimed = parseInt(listMatch[1]);
    const listed = (answer.match(/\d+\./g) || []).length;
    if (claimed !== listed && listed > 0) {
      console.warn(`⚠️ Count mismatch: claimed ${claimed}, listed ${listed}`);
      // Auto-correct if possible
      const corrected = answer.replace(listMatch[0], `${listed} ${listMatch[2]}`);
      return corrected;
    }
  }

  return answer;
}

// Regenerate with fallback (force inference)
async function regenerateWithFallback(query, context, conversationHistory) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const fallbackPrompt = `You are DocuMind AI. The user asked: "${query}"

**Available Context:**
${context}

**Instructions:**
The documents don't explicitly answer this question, but you must still help the user:
1. Extract ANY related information from the context (even indirect).
2. Reason logically to infer an answer (e.g., "lose laptop" → device security policies + IT contact).
3. Provide general workplace guidance (mark as "typically" or "generally").
4. Suggest who to contact (HR, IT, Manager) for specifics.

**Never say "context does not contain" without offering guidance.**

**Your helpful answer:**`;

  const messages = [{ role: "user", content: fallbackPrompt }];

  const chat = await groq.chat.completions.create({
    messages,
    model: MODEL_ID,
    max_tokens: 512,
    temperature: 0.5,
  });

  return chat.choices[0]?.message?.content || "I couldn't generate a helpful answer. Please contact your HR or IT department.";
}

// ----------- Streaming RAG ----------- //
async function streamGroqRAGWithHistory(question, context, conversationHistory, res, searchResults) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const cleanHistory = (conversationHistory || [])
    .slice(-4)  // Increased from 3
    .filter(msg => msg && msg.role && msg.content && typeof msg.content === 'string')
    .filter(msg => msg.content.length < 2000);

  const systemPrompt = `You are DocuMind, an intelligent AI assistant for Wonderlend Hubs employees. Your role is to help with company policies, procedures, and documentation.

**Core Principles:**
1. **Primary Source**: Always prioritize information from the provided context documents.
2. **Synthesis**: Combine multiple context chunks to form complete answers (e.g., "lose laptop" → link device policy + IT contact + reporting steps).
3. **Inference**: If context has related info but not exact match, reason logically (e.g., "switch company" → discuss resignation process, notice period, at-will employment from docs).
4. **Fallback**: If context is insufficient, provide general workplace guidance clearly marked as "general advice" (not company-specific), then suggest contacting HR/IT/Manager.
5. **Accuracy**: Validate numbers, dates, lists. If you say "two holidays," list exactly two. Double-check contradictions.
6. **Tone**: Professional, helpful, concise. Use bullet points for policies/steps.

**Response Structure:**
- Start with direct answer (1-2 sentences).
- Expand with relevant details from context (cite sections if available, e.g., "section 5.2").
- If context lacks info: "Our documentation doesn't cover [topic] specifically. Generally, [brief advice]. For details, contact [HR/IT/Manager]."
- **Never say "context does not contain" without offering any guidance.**

**Context Chunks Provided:**
${context}`;

  const messages = [{ role: "system", content: systemPrompt }];

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

  const stream = await groq.chat.completions.create({
    messages,
    model: MODEL_ID,
    max_tokens: 600,  // Increased from 512
    temperature: 0.3,
    stream: true
  });

  let fullAnswer = '';
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || '';
    if (token) {
      fullAnswer += token;
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
  }

  return fullAnswer;
}

// ----------- Non-streaming RAG (Enhanced Prompt) ----------- //
async function runGroqRAGWithHistory(question, context, conversationHistory) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const cleanHistory = (conversationHistory || [])
    .slice(-4)
    .filter(msg => msg && msg.role && msg.content && typeof msg.content === 'string')
    .filter(msg => msg.content.length < 2000);

  const systemPrompt = `You are DocuMind, an intelligent AI assistant for Wonderlend Hubs employees. Your role is to help with company policies, procedures, and documentation.

**Core Principles:**
1. **Primary Source**: Always prioritize information from the provided context documents.
2. **Synthesis**: Combine multiple context chunks to form complete answers (e.g., "lose laptop" → link device policy + IT contact + reporting steps).
3. **Inference**: If context has related info but not exact match, reason logically (e.g., "switch company" → discuss resignation process, notice period, at-will employment from docs).
4. **Fallback**: If context is insufficient, provide general workplace guidance clearly marked as "general advice" (not company-specific), then suggest contacting HR/IT/Manager.
5. **Accuracy**: Validate numbers, dates, lists. If you say "two holidays," list exactly two. Double-check contradictions.
6. **Tone**: Professional, helpful, concise. Use bullet points for policies/steps.

**Response Structure:**
- Start with direct answer (1-2 sentences).
- Expand with relevant details from context (cite sections if available, e.g., "section 5.2").
- If context lacks info: "Our documentation doesn't cover [topic] specifically. Generally, [brief advice]. For details, contact [HR/IT/Manager]."
- **Never say "context does not contain" without offering any guidance.**

**Context Chunks Provided:**
${context}`;

  const messages = [{ role: "system", content: systemPrompt }];

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
    max_tokens: 600,
    temperature: 0.3,
  });

  return chat.choices[0]?.message?.content || "No answer generated.";
}

// Conversational answer (no docs)
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

// Generate title
app.post("/api/generate-title", async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || messages.length === 0) {
      return res.json({ title: "New Chat" });
    }
    
    const userMessages = Array.isArray(messages) ? messages.slice(0, 3) : [messages];
    const combinedText = userMessages.join('. ');
    
    if (combinedText.length < 5) {
      return res.json({ title: "New Chat" });
    }
    
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const chat = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a title generator. Generate a short, descriptive 3-5 word title for this conversation. Be concise and specific. Do not use quotes or punctuation at the end."
        },
        {
          role: "user",
          content: `Generate a title for this conversation: "${combinedText}"`
        }
      ],
      model: MODEL_ID,
      max_tokens: 20,
      temperature: 0.3,
    });
    
    let title = chat.choices[0]?.message?.content?.trim() || "New Chat";
    title = title.replace(/^["']|["']$/g, '').replace(/\.$/, '').trim();
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }
    
    res.json({ title });
  } catch (err) {
    console.error("Title generation error:", err.message);
    res.json({ title: "New Chat" });
  }
});

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

// Index Single Document from S3
app.post("/api/index", async (req, res) => {
  try {
    const { s3Key } = req.body;
    if (!s3Key) {
      return res.status(400).json({ error: "Missing s3Key" });
    }
    console.log(`Indexing document: ${s3Key}`);

    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
    const response = await s3Client.send(command);
    const buffer = Buffer.from(await response.Body.transformToByteArray());

    let text = "";
    const ext = s3Key.split(".").pop().toLowerCase();
    if (ext === "pdf") {
      text = (await pdfParse(buffer)).text;
    } else if (ext === "docx" || ext === "doc") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (ext === "md" || ext === "txt") {
      text = buffer.toString("utf-8");
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ error: "No text extracted from document" });
    }

    const department = s3Key.split("/")[0];
    const title = s3Key.split("/").pop();

    const chunks = chunkText(text, 1500, 200);
    console.log(`Created ${chunks.length} chunks for ${title}`);
    let insertCount = 0;

    const kbId = s3Key.split('/')[0];
    const collectionName = getCollectionForKB(kbId);
    await ensureQdrantCollection(collectionName);

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

// Delete Document
app.delete("/api/documents", async (req, res) => {
  try {
    const s3Key = req.query.key;
    if (!s3Key) {
      return res.status(400).json({ error: "Missing s3Key in query parameter" });
    }

    console.log(`Deleting document: ${s3Key}`);

    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key
      }));
      console.log(`✓ Deleted from S3: ${s3Key}`);
    } catch (err) {
      console.error(`S3 delete failed:`, err.message);
    }

    let deletedCount = 0;
    try {
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
  console.log("✓ Backend running on port", PORT);
});
