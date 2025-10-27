const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { QdrantClient } = require("@qdrant/js-client-rest");
const fetch = require('node-fetch');
require('dotenv').config();

const S3_BUCKET = process.env.S3_BUCKET;
const BACKEND_URL = 'http://localhost:3200';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const KB_TO_COLLECTION = {
  'common-policies': 'kb_common',
  'devops': 'kb_devops',
  'platform-engineering': 'kb_platform',
  'product-management': 'kb_product',
  'solution-analysts': 'kb_solution',
};

// KB folders to reindex
const KB_FOLDERS = [
  'common-policies',
  'devops',
  'platform-engineering',
  'product-management',
  'solution-analysts'
];

// Check if document is already indexed in Qdrant
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
    // Collection might not exist yet
    return false;
  }
}

async function reindexKB(kbFolder) {
  try {
    console.log(`\n=== Reindexing KB: ${kbFolder} ===\n`);
    
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: `${kbFolder}/`
    });
    
    const data = await s3Client.send(command);
    const files = (data.Contents || []).filter(obj => obj.Size > 0);
    
    console.log(`Found ${files.length} files in ${kbFolder}/\n`);
    
    const collectionName = KB_TO_COLLECTION[kbFolder];
    
    let success = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const file of files) {
      try {
        // Check if already indexed
        const alreadyIndexed = await isDocumentIndexed(collectionName, file.Key);
        
        if (alreadyIndexed) {
          console.log(`⏭️  Skipped (already indexed): ${file.Key}`);
          skipped++;
          continue;
        }
        
        console.log(`Indexing: ${file.Key}`);
        
        const response = await fetch(`${BACKEND_URL}/api/index`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ s3Key: file.Key })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`  ✓ Indexed ${result.chunksCreated} chunks\n`);
          success++;
        } else {
          const error = await response.text();
          console.error(`  ✗ Failed: ${error}\n`);
          failed++;
        }
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (err) {
        console.error(`  ✗ Error: ${err.message}\n`);
        failed++;
      }
    }
    
    console.log(`\n${kbFolder} Summary: ${success} indexed, ${skipped} skipped, ${failed} failed\n`);
    
  } catch (err) {
    console.error(`Error reindexing ${kbFolder}:`, err);
  }
}

async function reindexAll() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Reindexing All Knowledge Bases      ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  for (const kbFolder of KB_FOLDERS) {
    await reindexKB(kbFolder);
  }
  
  console.log('\n✓ All knowledge bases reindexed!\n');
}

reindexAll();
