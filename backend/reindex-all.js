const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fetch = require('node-fetch');
require('dotenv').config();

const S3_BUCKET = process.env.S3_BUCKET;
const BACKEND_URL = 'http://localhost:3200';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

// KB folders to reindex
const KB_FOLDERS = [
  'common-policies',
  'devops',
  'platform-engineering',
  'product-management',
  'solution-analysts'
];

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
    
    let success = 0;
    let failed = 0;
    
    for (const file of files) {
      try {
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
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`  ✗ Error: ${err.message}\n`);
        failed++;
      }
    }
    
    console.log(`\n${kbFolder} Summary: ${success} succeeded, ${failed} failed\n`);
    
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
