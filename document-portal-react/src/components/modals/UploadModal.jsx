import React, { useState } from 'react'
import { X, Upload, FileText, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_PERMISSIONS, KNOWLEDGE_BASES } from '../../config/knowledgeBases'
import toast from 'react-hot-toast'
import { submitApprovalRequestBulk } from '../../services/docService'
import { useNotifications } from '../../contexts/NotificationsContext'

const MAX_FILE_SIZE_MB = 8
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

const toTitle = (name) => {
  const stem = name.replace(/\.[^/.]+$/, '')
  return stem
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1))
}

const toBase64 = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      const base64 = dataUrl.split(',')[1]
      resolve(base64)
    }
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

const UploadModal = ({ isOpen, onClose }) => {
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const permissions = ROLE_PERMISSIONS[user?.department] || ROLE_PERMISSIONS.general
  const allowedKBs = permissions.knowledgeBases

  const [kbGroup, setKbGroup] = useState('')
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const reset = () => {
    setKbGroup('')
    setFiles([])
    setSubmitting(false)
  }

  const onFileSelect = (e) => {
    const list = Array.from(e.target.files || [])
    // Check max file size per file
    const invalidFile = list.find(f => f.size > MAX_FILE_SIZE_BYTES)
    if (invalidFile) {
      toast.error(`File "${invalidFile.name}" exceeds max size of ${MAX_FILE_SIZE_MB} MB`)
      e.target.value = '' // Reset
      return
    }
    if (list.length) setFiles(list)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!kbGroup || files.length === 0) {
      toast.error('Select knowledge base and at least one file')
      return
    }

    if (files.some(f => f.size > MAX_FILE_SIZE_BYTES)) {
      toast.error(`Max file size allowed is ${MAX_FILE_SIZE_MB} MB`)
      return
    }

    if (files.length > 50) {
      toast.error('Maximum 50 files per upload')
      return
    }

    setSubmitting(true)

    try {
      // Convert all files to base64
      const items = await Promise.all(
        files.map(async (f) => {
          const b64 = await toBase64(f)
          return {
            title: toTitle(f.name),
            description: '',
            kbGroup,
            fileName: f.name,
            contentType: f.type || 'application/octet-stream',
            fileData: b64,
            requester: { name: user?.name || '', email: user?.email || '' },
          }
        })
      )

      // Split into batches of 5 to avoid API Gateway 10MB limit
      const BATCH_SIZE = 5
      let totalCreated = 0
      const allRequestIds = []
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE)
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(items.length / BATCH_SIZE)
        toast.loading(`Uploading batch ${batchNum}/${totalBatches}...`)
        try {
          const res = await submitApprovalRequestBulk(batch)
          totalCreated += res.created || 0
          allRequestIds.push(...(res.requestIds || []))
        } catch (err) {
          toast.error(`Batch ${batchNum} failed: ${err.message}`)
        }
      }

      addNotification({
        type: 'doc_submitted',
        title: files.length === 1 ? 'Document submitted' : 'Documents submitted',
        body: `${totalCreated} document${totalCreated === 1 ? '' : 's'} sent for approval`,
        meta: { requestIds: allRequestIds },
      })
      toast.success(`Submitted ${totalCreated} document${totalCreated === 1 ? '' : 's'} for approval`)

      reset()
      onClose()
    } catch (err) {
      toast.error('Upload failed: ' + (err.message || 'Unknown error'))
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-dark-secondary border border-dark-tertiary rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-dark-tertiary">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-3">
            <Upload className="w-6 h-6 text-primary-500" />
            Upload Documents
          </h2>
          <button
            onClick={() => {
              onClose()
              reset()
            }}
            className="p-2 hover:bg-dark-hover rounded-lg"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">
              Knowledge Base Group *
            </label>
            <select
              value={kbGroup}
              onChange={(e) => setKbGroup(e.target.value)}
              required
              className="w-full px-4 py-3 bg-dark-tertiary border border-dark-hover rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a group</option>
              {allowedKBs.map((kbId) => {
                const kb = KNOWLEDGE_BASES[kbId]
                if (!kb) return null
                return (
                  <option key={kbId} value={kbId}>
                    {kb.name}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">
              Select Files * <span className="text-text-muted font-normal">(Max 50 files, {MAX_FILE_SIZE_MB}MB per file)</span>
            </label>
            <input
              type="file"
              multiple
              onChange={onFileSelect}
              accept=".pdf,.doc,.docx,.txt,.md"
              className="w-full px-4 py-3 bg-dark-tertiary border border-dark-hover rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {files.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-text-secondary mb-2">
                  {files.length} file{files.length > 1 ? 's' : ''} selected
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-dark-tertiary border border-dark-hover rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-primary-500 flex-shrink-0" />
                        <span className="text-sm text-text-primary truncate">{f.name}</span>
                      </div>
                      <span className="text-xs text-text-muted ml-3 flex-shrink-0">
                        {(f.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-text-secondary">
              <p className="mb-1">Document titles are auto-generated from filenames.</p>
              <p className="text-xs text-text-muted">
                Supported formats: PDF, DOC, DOCX, TXT, MD.<br />
                <span className="font-bold text-red-500">Maximum file size: {MAX_FILE_SIZE_MB} MB</span>
              </p>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-dark-tertiary">
          <button
            type="button"
            onClick={() => {
              onClose()
              reset()
            }}
            className="px-6 py-2 bg-dark-tertiary border border-dark-hover text-text-primary rounded-lg hover:bg-dark-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || files.length === 0}
            className="px-6 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-text-primary rounded-lg disabled:opacity-50"
          >
            {submitting
              ? 'Uploading...'
              : `Submit ${files.length} file${files.length === 1 ? '' : 's'} for Approval`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadModal
