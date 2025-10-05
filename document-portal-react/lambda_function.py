import json
import boto3
import base64
from datetime import datetime

s3_client = boto3.client('s3')
BUCKET_NAME = 'document-portal-storage-195932288857'

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])

        file_name = body['fileName']
        file_data = body['fileData']  # base64 data URL
        kb_group = body['kbGroup']

        # Extract base64 content (remove data:type;base64, prefix)
        if ',' in file_data:
            file_data = file_data.split(',')[1]

        # Decode base64
        file_bytes = base64.b64decode(file_data)

        # Construct S3 key
        s3_key = f'{kb_group}/{file_name.replace(" ", "-").lower()}'

        # Upload to S3
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=file_bytes,
            ContentType=body.get('contentType', 'application/octet-stream')
        )

        s3_url = f's3://{BUCKET_NAME}/{s3_key}'

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                's3Url': s3_url,
                's3Key': s3_key
            })
        }

    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
