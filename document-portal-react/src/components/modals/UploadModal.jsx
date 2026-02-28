import React, { useState, useRef } from 'react'
import { X, Upload, FileText, AlertCircle, Trash2, File, UploadCloud } from 'lucide-react'
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
  const dropRef = useRef(null)

  const [kbGroup, setKbGroup] = useState('')
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  if (!isOpen) return null

  const reset = () => {
    setKbGroup('')
    setFiles([])
    setSubmitting(false)
    setProgress(0)
  }

  const addFiles = (fileList) => {
    const list = Array.from(fileList)
    const invalidFile = list.find(f => f.size > MAX_FILE_SIZE_BYTES)
    if (invalidFile) {
      toast.error(`"${invalidFile.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit`)
      return
    }
    const combined = [...files, ...list].slice(0, 50)
    setFiles(combined)
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const onFileSelect = (e) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!kbGroup || files.length === 0) {
      toast.error('Select knowledge base and at least one file')
      return
    }
    if (files.length > 50) {
      toast.error('Maximum 50 files per upload')
      return
    }

    setSubmitting(true)
    setProgress(0)

    try {
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

      const BATCH_SIZE = 5
      let totalCreated = 0
      const allRequestIds = []
      const totalBatches = Math.ceil(items.length / BATCH_SIZE)

      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE)
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        setProgress(Math.round((batchNum / totalBatches) * 100))

        try {
          const res = await submitApprovalRequestBulk(batch)
          totalCreated += res.created || 0
          allRequestIds.push(...(res.requestIds || []))
        } catch (err) {
          toast.error(`Batch ${batchNum} failed: ${err.message}`)
        }
      }

      setProgress(100)

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

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-dark-secondary border border-dark-tertiary rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col elevation-3 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-tertiary">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary-400" />
            Upload Documents
          </h2>
          <button onClick={() => { onClose(); reset() }} className="p-1.5 hover:bg-dark-hover rounded-lg transition-colors">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
          {/* KB Selection */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Knowledge Base
            </label>
            <select
              value={kbGroup}
              onChange={(e) => setKbGroup(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-dark-tertiary border border-dark-hover rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
            >
              <option value="">Select a knowledge base</option>
              {allowedKBs.map((kbId) => {
                const kb = KNOWLEDGE_BASES[kbId]
                if (!kb) return null
                return <option key={kbId} value={kbId}>{kb.name}</option>
              })}
            </select>
          </div>

          {/* Drop Zone */}
          <div
            ref={dropRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-primary-500 bg-primary-500/5'
                : 'border-dark-hover hover:border-primary-500/30 hover:bg-dark-tertiary/30'
            }`}
          >
            <input
              type="file"
              multiple
              onChange={onFileSelect}
              accept=".pdf,.doc,.docx,.txt,.md"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-primary-400' : 'text-text-muted'}`} />
            <p className="text-sm text-text-primary font-medium mb-0.5">
              {isDragging ? 'Drop files here' : 'Drop files or click to browse'}
            </p>
            <p className="text-[10px] text-text-muted">
              PDF, DOC, DOCX, TXT, MD &middot; Max {MAX_FILE_SIZE_MB}MB per file &middot; Up to 50 files
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-secondary">
                  {files.length} file{files.length > 1 ? 's' : ''} &middot; {formatSize(totalSize)}
                </p>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-dark-tertiary border border-dark-hover rounded-lg px-3 py-2 group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <File className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                      <span className="text-xs text-text-primary truncate">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-text-muted">{formatSize(f.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-red-400 text-text-muted transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          {submitting && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-secondary">Uploading...</span>
                <span className="text-xs text-primary-400 font-medium">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-dark-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-dark-tertiary">
          <button
            type="button"
            onClick={() => { onClose(); reset() }}
            className="px-4 py-2 bg-dark-tertiary border border-dark-hover text-text-primary rounded-lg hover:bg-dark-hover text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || files.length === 0 || !kbGroup}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors"
          >
            {submitting ? 'Uploading...' : `Submit ${files.length || 0} file${files.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadModal
