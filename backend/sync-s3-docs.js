const AWS = require("aws-sdk");
const { ChromaClient } = require("chromadb");
const pdfParse = require("pdf-parse");
require("dotenv").config();

const S3_BUCKET = process.env.S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION;

AWS.config.update({ region: AWS_REGION });
const s3 = new AWS.S3();
const mammoth = require("mammoth");
const fetch = require("node-fetch");

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

async function syncS3ToChroma() {
  console.log("Starting S3 to ChromaDB sync...");

  // Get or create collection
  const collection = await chroma.getOrCreateCollection({
    name: "documents",
    embeddingFunction: new NoopEmbeddingFunction(),
    metadata: { "hnsw:space": "cosine" },
  });

  // List all S3 objects
  const data = await s3.listObjectsV2({ Bucket: S3_BUCKET }).promise();
  const objects = data.Contents.filter(
    (obj) =>
      obj.Key.endsWith(".pdf") ||
      obj.Key.endsWith(".md") ||
      obj.Key.endsWith(".txt") ||
      obj.Key.endsWith(".docx")
  );

  console.log(`Found ${objects.length} documents to index`);

  for (const obj of objects) {
    try {
      console.log(`Processing: ${obj.Key}`);

      // Download file from S3
      const file = await s3
        .getObject({ Bucket: S3_BUCKET, Key: obj.Key })
        .promise();
      const buffer = file.Body;

      // Extract text
      let text = "";
      const ext = obj.Key.split(".").pop().toLowerCase();

      if (ext === "pdf") {
        text = (await pdfParse(buffer)).text;
      } else if (ext === "md" || ext === "txt") {
        text = buffer.toString("utf-8");
      } else if (ext === "docx") {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      }

      if (!text || text.trim().length < 10) {
        console.log(`Skipping empty/invalid: ${obj.Key}`);
        continue;
      }

      // Generate embedding
      const embedding = await getEmbedding(text);

      // Extract department from path
      const department = obj.Key.split("/")[0];

      // Store in ChromaDB
      await collection.add({
        ids: [obj.Key],
        embeddings: [embedding],
        metadatas: [
          {
            title: obj.Key.split("/").pop(),
            s3Key: obj.Key,
            department: department,
            size: obj.Size,
            lastModified: obj.LastModified.toISOString(),
          },
        ],
        documents: [text.slice(0, 10000)], // Limit to 10k chars per doc
      });

      console.log(`✓ Indexed: ${obj.Key}`);
    } catch (err) {
      console.error(`✗ Failed ${obj.Key}:`, err.message);
    }
  }

  console.log("Sync complete!");

  // Show collection stats
  const count = await collection.count();
  console.log(`Total documents in ChromaDB: ${count}`);
}

syncS3ToChroma()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
  });
