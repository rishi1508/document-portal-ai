import React, { useState } from 'react'
import { X, Upload, FileText, AlertCircle, Layers } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_PERMISSIONS, KNOWLEDGE_BASES } from '../../config/knowledgeBases'
import toast from 'react-hot-toast'
import { submitApprovalRequest, submitApprovalRequestBulk } from '../../services/docService'
import { useNotifications } from '../../contexts/NotificationsContext'

const toTitle = (name) => {
  const stem = name.replace(/\.[^/.]+$/, '')
  return stem
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1))
}

// Fixed base64 conversion - handles large files without stack overflow
const toBase64 = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // Get data URL and extract base64 part
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

  const [bulk, setBulk] = useState(false)
  const [kbGroup, setKbGroup] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const reset = () => {
    setBulk(false)
    setKbGroup('')
    setTitle('')
    setDescription('')
    setFiles([])
    setSubmitting(false)
  }

  const onFileSelect = (e) => {
    const list = Array.from(e.target.files || [])
    if (!list.length) return
    setFiles(list)
    if (!bulk && list[0]) setTitle(toTitle(list[0].name))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!kbGroup || files.length === 0) {
      toast.error('Select knowledge base and at least one file')
      return
    }
    setSubmitting(true)
    try {
      if (bulk && files.length > 1) {
        if (files.length > 50) {
          toast.error('Max 50 files per bulk upload')
          setSubmitting(false)
          return
        }

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

        // Split into batches of 5 files each to avoid 10MB limit
        const BATCH_SIZE = 5
        let totalCreated = 0
        const allRequestIds = []

        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          const batch = items.slice(i, i + BATCH_SIZE)
          toast.loading(`Uploading batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)}...`)

          try {
            const res = await submitApprovalRequestBulk(batch)
            totalCreated += res.created
            allRequestIds.push(...(res.requestIds || []))
          } catch (err) {
            console.error('Batch upload error:', err)
            toast.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${err.message}`)
          }
        }

        addNotification({
          type: 'doc_submitted',
          title: 'Bulk submitted',
          body: `${totalCreated} documents sent for approval`,
          meta: { requestIds: allRequestIds },
        })
        toast.success(`Submitted ${totalCreated} documents`)
      } else {
        // Single file upload
        const f = files[0]
        const b64 = await toBase64(f)
        const req = await submitApprovalRequest({
          title: title || toTitle(f.name),
          description,
          kbGroup,
          fileName: f.name,
          contentType: f.type || 'application/octet-stream',
          fileData: b64,
          requester: { name: user?.name || '', email: user?.email || '' },
        })
        addNotification({
          type: 'doc_submitted',
          title: 'Request submitted',
          body: `"${title || toTitle(f.name)}" sent for approval`,
          meta: { requestId: req.id },
        })
        toast.success('Request submitted')
      }
      reset()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Submission failed: ' + (err.message || 'Unknown error'))
      setSubmitting(false)
    }
  }


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-dark-secondary border border-dark-tertiary rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-dark-tertiary">
          <h2 className="text-xl font-semibold text-white flex items-center gap-3">
            <Upload className="w-6 h-6 text-primary-500" />
            Upload Document{bulk ? 's' : ''}
          </h2>
          <button onClick={() => { onClose(); reset() }} className="p-2 hover:bg-dark-hover rounded-lg">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <input
              id="bulk"
              type="checkbox"
              checked={bulk}
              onChange={(e) => {
                setBulk(e.target.checked)
                if (files[0] && !e.target.checked) setTitle(toTitle(files[0].name))
              }}
            />
            <label htmlFor="bulk" className="text-sm text-text-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary-500" />
              Bulk upload (auto titles)
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">Knowledge Base Group *</label>
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

          {!bulk && (
            <>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-dark-tertiary border border-dark-hover rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-dark-tertiary border border-dark-hover rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">
              {bulk ? 'Select files *' : 'Select file *'}
            </label>
            <input
              type="file"
              multiple={bulk}
              onChange={onFileSelect}
              accept=".pdf,.doc,.docx,.txt,.md"
              className="w-full px-4 py-3 bg-dark-tertiary border border-dark-hover rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {bulk && files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-dark-tertiary border border-dark-hover rounded-lg px-3 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-primary-500" />
                      <span className="text-sm text-text-primary truncate">{f.name}</span>
                    </div>
                    <span className="text-xs text-text-muted ml-3 truncate">{toTitle(f.name)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary">
              Bulk upload auto-generates titles from filenames. Single upload allows custom title and description.
            </p>
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
            disabled={submitting}
            className="px-6 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : bulk ? `Submit ${files.length} files` : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadModal
