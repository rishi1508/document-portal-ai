const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { QdrantClient } = require("@qdrant/js-client-rest");
require('dotenv').config();

const S3_BUCKET = process.env.S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION;
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

const s3Client = new S3Client({ region: AWS_REGION });

const qdrant = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

const KB_TO_COLLECTION = {
  'common-policies': 'kb_common',
  'devops': 'kb_devops',
  'platform-engineering': 'kb_platform',
  'product-management': 'kb_product',
  'solution-analysts': 'kb_solution',
};

async function cleanupCollection(collectionName, kbFolder) {
  try {
    console.log(`\n=== Cleaning collection: ${collectionName} (KB: ${kbFolder}) ===\n`);

    // Get all S3 keys
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: `${kbFolder}/`
    });
    
    const data = await s3Client.send(command);
    const validS3Keys = new Set((data.Contents || []).map(obj => obj.Key));
    console.log(`Found ${validS3Keys.size} documents in S3`);

    // Scroll through collection
    const allPoints = [];
    let offset = null;
    
    do {
      const scrollResult = await qdrant.scroll(collectionName, {
        limit: 100,
        offset: offset,
        with_payload: true,
        with_vector: false
      });
      
      allPoints.push(...scrollResult.points);
      offset = scrollResult.next_page_offset;
    } while (offset);

    console.log(`Found ${allPoints.length} vectors in Qdrant`);

    // Find orphaned points
    const orphanedPoints = allPoints.filter(point => {
      const s3Key = point.payload?.s3Key;
      return s3Key && !validS3Keys.has(s3Key);
    });

    if (orphanedPoints.length === 0) {
      console.log(`✓ No orphaned vectors in ${collectionName}\n`);
      return 0;
    }

    console.log(`Found ${orphanedPoints.length} orphaned vectors`);

    // Delete in batches
    const orphanedIds = orphanedPoints.map(p => p.id);
    for (let i = 0; i < orphanedIds.length; i += 100) {
      const batch = orphanedIds.slice(i, i + 100);
      await qdrant.delete(collectionName, {
        wait: true,
        points: batch
      });
    }

    console.log(`✓ Deleted ${orphanedPoints.length} orphaned vectors from ${collectionName}\n`);
    return orphanedPoints.length;

  } catch (err) {
    console.error(`Cleanup error for ${collectionName}:`, err.message);
    return 0;
  }
}

async function cleanupAll() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Cleaning All Qdrant Collections     ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  let totalDeleted = 0;
  
  for (const [kbFolder, collectionName] of Object.entries(KB_TO_COLLECTION)) {
    const deleted = await cleanupCollection(collectionName, kbFolder);
    totalDeleted += deleted;
  }
  
  console.log(`\n✓ Cleanup complete! Total deleted: ${totalDeleted} vectors\n`);
}

cleanupAll();
