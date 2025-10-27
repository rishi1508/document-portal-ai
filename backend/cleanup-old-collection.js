const { QdrantClient } = require("@qdrant/js-client-rest");
require('dotenv').config();

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

async function deleteOldCollection() {
  try {
    console.log('\n=== Cleaning Up Old Collection ===\n');
    
    // Check if old "documents" collection exists
    const collections = await qdrant.getCollections();
    const hasDocumentsCollection = collections.collections.some(c => c.name === 'documents');
    
    if (!hasDocumentsCollection) {
      console.log('✓ Old "documents" collection does not exist. Nothing to clean up.\n');
      return;
    }
    
    console.log('Found old "documents" collection. Deleting...');
    
    await qdrant.deleteCollection('documents');
    
    console.log('✓ Successfully deleted old "documents" collection\n');
    console.log('Space saved! Qdrant is now optimized with only active KB collections.\n');
    
    // Show remaining collections
    const remainingCollections = await qdrant.getCollections();
    console.log('Active collections:');
    remainingCollections.collections.forEach(c => {
      console.log(`  - ${c.name}`);
    });
    console.log();
    
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}

deleteOldCollection();
