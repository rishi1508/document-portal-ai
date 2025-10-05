// src/services/docService.js
const DOCS_KEY = 'documind_docs'
const REQUESTS_KEY = 'documind_doc_requests'

const API_BASE = import.meta.env.VITE_API_BASE
const S3_BUCKET = import.meta.env.VITE_S3_BUCKET

const API_ENDPOINT = `${API_BASE}/upload`
const LIST_DOCS_ENDPOINT = `${API_BASE}/list-documents`
const APPROVALS_BULK_ENDPOINT = `${API_BASE}/approvals/bulk`
const APPROVALS_PENDING_ENDPOINT = `${API_BASE}/approvals/pending`
const APPROVALS_APPROVE_ENDPOINT = `${API_BASE}/approvals`

const load = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) || fallback } catch { return fallback }
}
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Fetch documents from S3 by folder
export const listDocuments = async (folder = '') => {
  try {
    const url = folder ? LIST_DOCS_ENDPOINT + '?folder=' + folder : LIST_DOCS_ENDPOINT
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch documents')
    const data = await response.json()
    return data.documents || []
  } catch (error) {
    console.error('Error listing documents from S3:', error)
    return load(DOCS_KEY, [])
  }
}

export const setDocuments = (docs) => save(DOCS_KEY, docs)

export const listApprovalRequests = () => load(REQUESTS_KEY, [])
export const setApprovalRequests = (reqs) => save(REQUESTS_KEY, reqs)

// Single approval request (legacy - keeps local storage for backward compat)
export const submitApprovalRequest = async ({ title, description, kbGroup, file, requester }) => {
  const reqs = listApprovalRequests()
  const fileData = file ? await fileToBase64(file) : null

  const newReq = {
    id: Date.now() + '_' + Math.random().toString(36).slice(2,8),
    title,
    description,
    kbGroup,
    fileName: file?.name || 'document.md',
    fileSize: file ? (file.size/1024).toFixed(1) + ' KB' : 'N/A',
    fileData: fileData,
    fileType: file?.type || 'text/markdown',
    requester,
    createdAt: new Date().toISOString()
  }
  reqs.unshift(newReq)
  setApprovalRequests(reqs)
  return newReq
}

// NEW: Bulk approval request (sends to backend)
export async function submitApprovalRequestBulk(items) {
  try {
    const res = await fetch(APPROVALS_BULK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) throw new Error('submitApprovalRequestBulk failed')
    return res.json()
  } catch (error) {
    console.error('Bulk submission error:', error)
    throw error
  }
}

// NEW: List pending approvals with pagination
export async function listPendingApprovals(limit = 50, nextToken = null) {
  try {
    const q = new URLSearchParams({ limit: String(limit) })
    if (nextToken) q.set('nextToken', nextToken)
    const res = await fetch(APPROVALS_PENDING_ENDPOINT + '?' + q.toString())
    if (!res.ok) throw new Error('listPendingApprovals failed')
    return res.json() // { items, nextToken }
  } catch (error) {
    console.error('List pending error:', error)
    // Fallback to local storage
    return { items: listApprovalRequests(), nextToken: null }
  }
}

// NEW: Approve request via API
export async function approveRequest(requestId) {
  try {
    const res = await fetch(`${APPROVALS_APPROVE_ENDPOINT}/${encodeURIComponent(requestId)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (!res.ok) throw new Error('approveRequest failed')
    return res.json()
  } catch (error) {
    console.error('Approve error:', error)
    // Fallback to legacy local approve
    return legacyApprove(requestId)
  }
}

// NEW: Reject request via API
export async function rejectRequest(requestId, reason = '') {
  try {
    const res = await fetch(`${APPROVALS_APPROVE_ENDPOINT}/${encodeURIComponent(requestId)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) throw new Error('rejectRequest failed')
    return res.json()
  } catch (error) {
    console.error('Reject error:', error)
    // Fallback to legacy deny
    denyRequest(requestId)
  }
}

// Legacy approve (local storage fallback)
const legacyApprove = async (requestId) => {
  const reqs = listApprovalRequests()
  const idx = reqs.findIndex(r => r.id === requestId)
  if (idx === -1) throw new Error('Request not found')
  const req = reqs[idx]

  const s3Path = await uploadToS3(req.fileName, req.fileData, req.kbGroup, req.fileType)

  const docs = load(DOCS_KEY, [])
  const nextId = docs.length ? Math.max(...docs.map(d => d.id)) + 1 : 1
  const newDoc = {
    id: nextId,
    name: req.title || req.fileName,
    type: req.fileName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Markdown',
    size: req.fileSize,
    date: new Date().toISOString().slice(0,10),
    category: req.kbGroup,
    url: s3Path,
    fileData: req.fileData,
    fileType: req.fileType,
  }
  const updatedDocs = [newDoc, ...docs]
  setDocuments(updatedDocs)

  reqs.splice(idx, 1)
  setApprovalRequests(reqs)

  return { newDoc }
}

// Legacy deny
export const denyRequest = (requestId) => {
  const reqs = listApprovalRequests().filter(r => r.id !== requestId)
  setApprovalRequests(reqs)
}

const uploadToS3 = async (fileName, fileData, kbGroup, fileType) => {
  try {
    console.log('Uploading to S3 via backend API...')

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: fileName,
        fileData: fileData,
        kbGroup: kbGroup,
        contentType: fileType
      })
    })

    if (!response.ok) throw new Error('S3 upload failed: ' + response.statusText)

    const result = await response.json()
    console.log('S3 upload successful:', result.s3Url)
    return result.s3Url

  } catch (error) {
    console.error('S3 upload error:', error)
    const fallbackPath = `s3://${S3_BUCKET}/` + kbGroup + '/' + fileName.replace(/\s+/g, '-').toLowerCase()
    console.warn('Using fallback S3 path:', fallbackPath)
    return fallbackPath
  }
}
