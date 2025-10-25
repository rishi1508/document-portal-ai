const AWS = require('aws-sdk');
const fetch = require('node-fetch');
require('dotenv').config();

const S3_BUCKET = process.env.S3_BUCKET;
const BACKEND_URL = 'http://localhost:3200';

AWS.config.update({ region: process.env.AWS_REGION });
const s3 = new AWS.S3();

async function reindexAll() {
  try {
    // List all documents from S3 approved folder
    const data = await s3.listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: 'common-policies/'  // Adjust to your approved folder
    }).promise();

    console.log(`Found ${data.Contents.length} documents to re-index`);

    for (const obj of data.Contents) {
      if (obj.Size === 0) continue;  // Skip folders
      
      console.log(`\nIndexing: ${obj.Key}`);
      
      const response = await fetch(`${BACKEND_URL}/api/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key: obj.Key })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✓ Success: ${result.chunksCreated} chunks created`);
      } else {
        console.error(`✗ Failed: ${result.error}`);
      }
      
      // Rate limit: wait 2 seconds between documents
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n✓ Re-indexing complete!');
  } catch (err) {
    console.error('Re-index error:', err);
  }
}

reindexAll();
