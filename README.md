# Document Portal - AI-Powered Knowledge Management System

A modern, production-ready document management system with AI-powered search using AWS Bedrock, built with React and AWS services.

## Features

- 📄 **Bulk Document Upload** - Upload up to 50 documents at once with auto-generated titles
- 🤖 **AI-Powered Search** - Query documents using natural language via AWS Bedrock
- 👥 **Department-Based Access Control** - Role-based permissions for different teams
- ✅ **Approval Workflow** - Admin approval system for document uploads
- 🔍 **Knowledge Base Integration** - Automatic sync with AWS Bedrock Knowledge Bases
- 📊 **Real-time Pagination** - Handle large document libraries efficiently
- 🎨 **Modern Dark UI** - Beautiful, responsive interface with Tailwind CSS

## Architecture

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Hot Toast** for notifications

### Backend (AWS)
- **Lambda Functions** (Python 3.13)
  - Document upload handler
  - List documents from S3
  - Bedrock query handler
  - Approval workflow (bulk, pending, approve, reject)
- **S3** for document storage
- **DynamoDB** for approval tracking
- **API Gateway** REST API
- **Bedrock Knowledge Bases** for AI search
- **CloudWatch** for logging

## Prerequisites

- Node.js 18+ and npm
- AWS CLI configured
- AWS Account with access to:
  - Lambda
  - S3
  - DynamoDB
  - API Gateway
  - Bedrock

## Setup

### 1. Clone the repository

\`\`\`bash
git clone <your-repo-url>
cd document-portal-react
\`\`\`

### 2. Install dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your AWS details:

\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` with your values:
- AWS account ID
- API Gateway ID
- S3 bucket name
- Bedrock Knowledge Base ID
- DynamoDB table name

### 4. Deploy AWS Infrastructure

#### Create DynamoDB Table

\`\`\`bash
aws dynamodb create-table \
  --table-name DocApprovalRequests \
  --attribute-definitions \
    AttributeName=requestId,AttributeType=S \
    AttributeName=status,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema AttributeName=requestId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    '[{
      "IndexName": "status-createdAt-index",
      "KeySchema": [
        {"AttributeName": "status", "KeyType": "HASH"},
        {"AttributeName": "createdAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }]' \
  --region ap-south-1
\`\`\`

#### Deploy Lambda Functions

See `backend/` directory for Lambda function code and deployment instructions.

#### Create API Gateway Endpoints

Use the provided `create_approval_api_endpoints.sh` script or manually create endpoints in AWS Console.

### 5. Start development server

\`\`\`bash
npm run dev
\`\`\`

## Project Structure

\`\`\`
document-portal-react/
├── src/
│   ├── components/
│   │   ├── layout/         # Sidebar, Header, InputArea
│   │   └── modals/         # Upload, Approvals modals
│   ├── contexts/           # React contexts (Auth, Chat, etc.)
│   ├── services/           # API services
│   ├── config/             # Knowledge base configuration
│   └── App.jsx
├── backend/                # Lambda functions (Python)
│   ├── lambda_approvals_bulk.py
│   ├── lambda_list_pending.py
│   ├── lambda_approve_request.py
│   ├── lambda_reject_request.py
│   └── lambda_query_bedrock.py
├── .env.example           # Environment variables template
└── README.md
\`\`\`

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_AWS_REGION` | AWS region | `ap-south-1` |
| `VITE_AWS_ACCOUNT_ID` | Your AWS account ID | `123456789012` |
| `VITE_API_GATEWAY_ID` | API Gateway ID | `abc123xyz` |
| `VITE_API_BASE` | API Gateway base URL | `https://abc123.execute-api.ap-south-1.amazonaws.com/test` |
| `VITE_S3_BUCKET` | S3 bucket for documents | `my-document-bucket` |
| `VITE_BEDROCK_KB_ID` | Bedrock Knowledge Base ID | `ABC123DEF456` |
| `VITE_APPROVALS_TABLE` | DynamoDB table name | `DocApprovalRequests` |

## Usage

### Upload Documents

1. Click **Upload** in sidebar
2. Choose single or bulk upload
3. Select knowledge base group
4. Choose files (max 50 for bulk)
5. Submit for approval

### Admin Approval

1. Click **Approvals** in sidebar (admin only)
2. Review pending requests
3. Approve or reject documents
4. Approved files sync to Knowledge Base automatically

### AI Search

1. Type questions in the chat input
2. AI searches across all approved documents
3. Responses include source citations

## Security Notes

- Never commit `.env` files to version control
- Rotate AWS credentials regularly
- Use IAM roles with least-privilege access
- Enable CloudTrail for audit logging
- Configure S3 bucket policies appropriately

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
