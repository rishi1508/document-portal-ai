# DocuMind AI - Enterprise Document Intelligence Platform

An AI-powered document management system with natural language search, built on a fully serverless AWS architecture. Upload documents, organize them into department knowledge bases, and query them using conversational AI powered by RAG (Retrieval-Augmented Generation).

<!-- Screenshots: Add screenshots of the Dashboard, Chat, and Documents pages here -->
<!-- ![Dashboard](docs/screenshots/dashboard.png) -->
<!-- ![AI Chat](docs/screenshots/chat.png) -->
<!-- ![Documents](docs/screenshots/documents.png) -->

## Key Technical Highlights

- **RAG Architecture** - Vector embeddings stored in Qdrant, retrieved at query time, and fed to an LLM for grounded, cited answers
- **Serverless Backend** - AWS Lambda + API Gateway + S3 + DynamoDB with zero server management
- **Real-time Document Processing** - Upload triggers automatic text extraction (PDF/DOCX), chunking, embedding, and vector indexing
- **Department-level RBAC** - Knowledge bases scoped by team (DevOps, Platform, Product, Analysts) with role-based permissions
- **Enterprise UI** - Dark/light theme, loading skeletons, drag-and-drop upload, document preview, bulk actions
- **Conversation Context** - Multi-turn AI chat with conversation history, auto-generated titles, and source citations

## Architecture

```
                                    +------------------+
                                    |   React Frontend |
                                    |   (Vite + TW)    |
                                    +--------+---------+
                                             |
                              +--------------+--------------+
                              |                             |
                    +---------v---------+        +----------v----------+
                    |   API Gateway     |        |   Express Backend   |
                    |   (REST API)      |        |   (Node.js :3200)   |
                    +---------+---------+        +----------+----------+
                              |                             |
              +---------------+---------------+    +--------+--------+
              |               |               |    |                 |
        +-----v-----+  +-----v-----+  +------v-+  |  +--------+    |
        |   Lambda   |  |   Lambda   |  | Lambda |  |  | Groq / |    |
        |  Upload    |  |  List Docs |  | Approve|  |  | Bedrock|    |
        +-----+------+  +-----+-----+  +----+---+  |  +---+----+    |
              |               |              |      |      |         |
        +-----v---------------v--------------v------v------v---------v--+
        |                        AWS S3                                  |
        |            (Document Storage by KB Folder)                     |
        +----------------------------------------------------------------+
              |                                           |
        +-----v-----------+                    +----------v---------+
        |    DynamoDB      |                    |     Qdrant         |
        | (Approval Table) |                    | (Vector Database)  |
        +------------------+                    +--------------------+
```

## Features

### Document Management
- Bulk upload (up to 50 files, drag-and-drop support)
- File type icons and color-coded badges (PDF, DOCX, TXT, MD)
- Document preview (PDF in-browser, Word via Google Docs Viewer, text/markdown inline)
- Sort by name, type, size, or date; full-text search
- Bulk select, download, and delete (admin)
- Copy shareable presigned URL to clipboard
- Document metadata panel with S3 key details

### AI Chat
- Natural language Q&A powered by RAG
- Knowledge base-scoped conversations
- Source citations with clickable document links
- Conversation history with auto-generated titles
- Multi-turn context (last 10 messages)
- Copy assistant responses to clipboard

### Enterprise Dashboard
- Document count and storage stats across knowledge bases
- Per-KB document breakdown with progress bars
- Recent documents and chat history feeds
- Quick action cards for common tasks

### Admin Workflow
- Document approval queue with pagination
- Approve/reject with multi-stage progress indicator
- Notification system for uploads and approvals

### Settings & UX
- Dark/Light/System theme with polished CSS variables
- Adjustable font size (Small/Medium/Large)
- Collapsible sidebar with icon-only mode
- Loading skeletons throughout (no spinners)
- Glassmorphic header and input areas
- Keyboard shortcuts (Enter to send, Shift+Enter for newline)
- Error boundary with recovery UI

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Vite 5 | Build tool |
| Tailwind CSS 3 | Utility-first styling |
| Lucide React | Icon library |
| React Router 6 | Client-side routing |
| React Hot Toast | Toast notifications |
| Framer Motion | Animations |
| date-fns | Date formatting |

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express | API server |
| Groq SDK | LLM inference |
| Qdrant | Vector database |
| AWS SDK | S3, DynamoDB integration |
| PDF-Parse | PDF text extraction |
| Mammoth | DOCX text extraction |

### Infrastructure (AWS)
| Service | Purpose |
|---------|---------|
| Lambda | Serverless functions |
| API Gateway | REST API endpoints |
| S3 | Document storage |
| DynamoDB | Approval workflow |
| Bedrock | AI/ML (optional) |
| CloudWatch | Logging & monitoring |

## Getting Started

### Prerequisites
- Node.js 18+
- AWS CLI configured
- Qdrant instance (cloud or self-hosted)

### 1. Clone & Install

```bash
git clone https://github.com/rishi1508/document-portal-ai.git
cd document-portal-ai/document-portal-react
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in your AWS and backend details:

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE` | API Gateway base URL |
| `VITE_CHAT_API` | Backend chat endpoint |
| `VITE_S3_BUCKET` | S3 bucket name |
| `VITE_AWS_REGION` | AWS region |

### 3. Start Backend

```bash
cd ../backend
npm install
node index.js
```

### 4. Start Frontend

```bash
cd ../document-portal-react
npm run dev
```

### 5. Demo Credentials

| Username | Password | Department |
|----------|----------|------------|
| devops-user | devops123 | DevOps |
| platform-user | platform123 | Platform Engineering |
| analyst-user | analyst123 | Solution Analysts |
| product-user | product123 | Product Management |

Admin accounts use the `-admin` suffix (e.g., `devops-admin` / `devopsadmin123`).

## Project Structure

```
document-portal-ai/
├── document-portal-react/     # React frontend
│   ├── src/
│   │   ├── pages/             # Dashboard, Documents, Chat, Admin, Login
│   │   ├── components/
│   │   │   ├── layout/        # Sidebar, Header, ChatContainer, InputArea
│   │   │   ├── chat/          # Message, WelcomeScreen, ThinkingIndicator
│   │   │   ├── modals/        # Upload, Settings, History, Approvals
│   │   │   └── common/        # ProtectedRoute, ErrorBoundary
│   │   ├── contexts/          # Auth, Chat, Settings, Notifications
│   │   ├── services/          # API client (docService)
│   │   └── config/            # Knowledge base definitions
│   └── public/
├── backend/                   # Express API server
│   ├── index.js               # Main server (chat, upload, documents)
│   ├── indexing-worker.js     # Background document indexer
│   └── sync-s3-docs.js        # S3 document sync utility
└── aws/                       # AWS CLI/SDK distribution
```

## Security Notes

- Environment variables are never committed (`.env` in `.gitignore`)
- Demo authentication is client-side only (for portfolio demonstration)
- Production deployment should use AWS Cognito or similar for authentication
- S3 presigned URLs expire after 15 minutes
- RBAC enforced at the knowledge base level per department

## License

MIT

## Author

**Rishi** - [GitHub](https://github.com/rishi1508)
