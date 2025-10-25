const AWS = require('aws-sdk');
require('dotenv').config();

const SQS_URL = process.env.INDEXING_SQS_URL;
AWS.config.update({ region: process.env.AWS_REGION });
const sqs = new AWS.SQS();

async function pollQueue() {
  while (true) {
    try {
      const resp = await sqs.receiveMessage({
        QueueUrl: SQS_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20
      }).promise();

      if (resp.Messages && resp.Messages.length) {
        for (const msg of resp.Messages) {
          const { s3Key } = JSON.parse(msg.Body);
          console.log(`Indexing from queue: ${s3Key}`);

          // Call backend re-index
          const res = await fetch('http://localhost:3200/api/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ s3Key })
          });
          const result = await res.json();
          console.log(result);

          // Delete message after processing
          await sqs.deleteMessage({
            QueueUrl: SQS_URL,
            ReceiptHandle: msg.ReceiptHandle
          }).promise();
        }
      }
    } catch (err) {
      console.error('Worker error:', err);
    }
    await new Promise(r => setTimeout(r, 5000)); // small delay
  }
}

pollQueue();
