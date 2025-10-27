const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { QdrantClient } = require("@qdrant/js-client-rest");
require('dotenv').config();

const S3_BUCKET = process.env.S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION;
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "documents";

const s3Client = new S3Client({ region: AWS_REGION });

const qdrant = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
});

async function cleanupOrphanedVectors() {
    try {
        console.log('Starting Qdrant cleanup for orphaned vectors...\n');

        // Step 1: Get all S3 keys
        console.log('Fetching all documents from S3...');
        const s3Objects = [];
        let continuationToken = null;

        do {
            const command = new ListObjectsV2Command({
                Bucket: S3_BUCKET,
                Prefix: 'common-policies/',
                ContinuationToken: continuationToken
            });

            const data = await s3Client.send(command);
            s3Objects.push(...(data.Contents || []));
            continuationToken = data.NextContinuationToken;
        } while (continuationToken);

        const validS3Keys = new Set(s3Objects.map(obj => obj.Key));
        console.log(`Found ${validS3Keys.size} documents in S3\n`);

        // Step 2: Scroll through all Qdrant points
        console.log('Fetching all vectors from Qdrant...');
        const allPoints = [];
        let offset = null;

        do {
            const scrollResult = await qdrant.scroll(QDRANT_COLLECTION, {
                limit: 100,
                offset: offset,
                with_payload: true,
                with_vector: false
            });

            allPoints.push(...scrollResult.points);
            offset = scrollResult.next_page_offset;
        } while (offset);

        console.log(`Found ${allPoints.length} vectors in Qdrant\n`);

        // Step 3: Find orphaned points (s3Key not in S3)
        const orphanedPoints = allPoints.filter(point => {
            const s3Key = point.payload?.s3Key;
            return s3Key && !validS3Keys.has(s3Key);
        });

        if (orphanedPoints.length === 0) {
            console.log('✓ No orphaned vectors found. Qdrant is clean!\n');
            return;
        }

        // Step 4: Group orphaned points by s3Key for reporting
        const orphanedByDocument = {};
        orphanedPoints.forEach(point => {
            const s3Key = point.payload?.s3Key;
            if (!orphanedByDocument[s3Key]) {
                orphanedByDocument[s3Key] = [];
            }
            orphanedByDocument[s3Key].push(point.id);
        });

        console.log(`Found ${orphanedPoints.length} orphaned vectors for ${Object.keys(orphanedByDocument).length} deleted documents:\n`);
        Object.entries(orphanedByDocument).forEach(([s3Key, pointIds]) => {
            console.log(`  - ${s3Key}: ${pointIds.length} chunks`);
        });

        console.log('\nDeleting orphaned vectors...');

        // Step 5: Delete in batches of 100
        const orphanedIds = orphanedPoints.map(p => p.id);
        for (let i = 0; i < orphanedIds.length; i += 100) {
            const batch = orphanedIds.slice(i, i + 100);
            await qdrant.delete(QDRANT_COLLECTION, {
                wait: true,
                points: batch
            });
            console.log(`  Deleted batch ${Math.floor(i / 100) + 1}: ${batch.length} vectors`);
        }

        console.log(`\n✓ Cleanup complete! Deleted ${orphanedPoints.length} orphaned vectors\n`);

    } catch (err) {
        console.error('Cleanup error:', err);
        process.exit(1);
    }
}

cleanupOrphanedVectors();
