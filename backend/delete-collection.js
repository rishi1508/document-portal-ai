const { ChromaClient } = require('chromadb');

const chroma = new ChromaClient({
  host: 'localhost',
  port: 8000,
  ssl: false,
});

(async () => {
  try {
    await chroma.deleteCollection({ name: 'documents' });
    console.log('Collection "documents" deleted successfully');
  } catch (err) {
    console.error('Delete failed:', err.message);
  }
})();
