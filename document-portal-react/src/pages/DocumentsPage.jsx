import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useChat } from '../contexts/ChatContext'
import { useSettings } from '../contexts/SettingsContext'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import {
  Search, Download, Trash2, FileText, SortAsc, SortDesc, Eye,
  CheckSquare, Square, X, ExternalLink, Info, File, FileType,
  Copy, Check, Upload, FolderOpen
} from 'lucide-react'
import { listDocuments, deleteDocuments } from '../services/docService'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/modals/ConfirmModal'

const FILE_ICONS = {
  PDF: { color: 'text-red-400', bg: 'bg-red-500/10' },
  Word: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
  DOCX: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
  DOC: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
  TXT: { color: 'text-slate-400', bg: 'bg-slate-500/10' },
  MD: { color: 'text-violet-400', bg: 'bg-violet-500/10' },
  Markdown: { color: 'text-violet-400', bg: 'bg-violet-500/10' },
  JSON: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
  YAML: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
}

const getFileStyle = (type, name) => {
  if (type && FILE_ICONS[type]) return FILE_ICONS[type]
  if (name) {
    const ext = name.split('.').pop()?.toUpperCase()
    if (ext && FILE_ICONS[ext]) return FILE_ICONS[ext]
  }
  return { color: 'text-primary-400', bg: 'bg-primary-500/10' }
}

const SkeletonRow = () => (
  <tr className="border-b border-dark-tertiary">
    <td className="px-4 py-3"><div className="w-5 h-5 rounded skeleton" /></td>
    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg skeleton" /><div className="w-40 h-3 rounded skeleton" /></div></td>
    <td className="px-4 py-3"><div className="w-10 h-5 rounded-full skeleton" /></td>
    <td className="px-4 py-3"><div className="w-14 h-3 rounded skeleton" /></td>
    <td className="px-4 py-3"><div className="w-20 h-3 rounded skeleton" /></td>
    <td className="px-4 py-3"><div className="w-16 h-3 rounded skeleton mx-auto" /></td>
  </tr>
)

const DocumentsPage = () => {
  const { user } = useAuth()
  const { currentKB } = useChat()
  const { sidebarCollapsed } = useSettings()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedDocs, setSelectedDocs] = useState(new Set())
  const [previewDoc, setPreviewDoc] = useState(null)
  const [metadataDoc, setMetadataDoc] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewContent, setPreviewContent] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)

  useEffect(() => {
    loadDocuments()
  }, [currentKB])

  const loadDocuments = async () => {
    setLoading(true)
    setSelectedDocs(new Set())
    try {
      const docs = await listDocuments(currentKB)
      setDocuments(docs)
    } catch (err) {
      console.error('Failed to load documents:', err)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleSelectAll = () => {
    if (selectedDocs.size === filteredDocs.length && filteredDocs.length > 0) {
      setSelectedDocs(new Set())
    } else {
      setSelectedDocs(new Set(filteredDocs.map(d => d.s3Key)))
    }
  }

  const handleSelectDoc = (s3Key) => {
    const newSelected = new Set(selectedDocs)
    if (newSelected.has(s3Key)) {
      newSelected.delete(s3Key)
    } else {
      newSelected.add(s3Key)
    }
    setSelectedDocs(newSelected)
  }

  const handleDownload = async (doc) => {
    try {
      const toastId = toast.loading('Generating download link...')
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/get-document?s3Key=${encodeURIComponent(doc.s3Key)}`
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get download URL')
      }
      const data = await response.json()
      toast.dismiss(toastId)
      if (data.presignedUrl) {
        const link = document.createElement('a')
        link.href = data.presignedUrl
        link.download = doc.originalName
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Download started')
      } else {
        throw new Error('No download URL received')
      }
    } catch (err) {
      console.error('Download error:', err)
      toast.dismiss()
      toast.error('Download failed: ' + err.message)
    }
  }

  const handleBulkDownload = async () => {
    const selected = documents.filter(d => selectedDocs.has(d.s3Key))
    toast.loading(`Downloading ${selected.length} files...`)
    for (const doc of selected) {
      await handleDownload(doc)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    toast.dismiss()
    toast.success(`Downloaded ${selected.length} files`)
  }

  const handleDelete = async () => {
    if (!user?.isAdmin) {
      toast.error('Only admins can delete documents')
      return
    }
    try {
      const keys = Array.from(selectedDocs)
      await deleteDocuments(keys)
      toast.success(`Deleted ${keys.length} document${keys.length > 1 ? 's' : ''}`)
      setSelectedDocs(new Set())
      setDeleteConfirm(false)
      loadDocuments()
    } catch (err) {
      toast.error('Delete failed: ' + err.message)
    }
  }

  const handlePreview = async (doc) => {
    setPreviewDoc(doc)
    setPreviewLoading(true)
    setPreviewContent(null)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/get-document?s3Key=${encodeURIComponent(doc.s3Key)}`
      )
      if (!response.ok) throw new Error('Failed to load preview')
      const data = await response.json()
      setPreviewContent(data)
    } catch (err) {
      console.error('Preview error:', err)
      toast.error('Failed to load preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleCopyLink = async (doc) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/get-document?s3Key=${encodeURIComponent(doc.s3Key)}`
      )
      if (!response.ok) throw new Error('Failed to get URL')
      const data = await response.json()
      if (data.presignedUrl) {
        await navigator.clipboard.writeText(data.presignedUrl)
        setCopiedKey(doc.s3Key)
        toast.success('Link copied to clipboard')
        setTimeout(() => setCopiedKey(null), 2000)
      }
    } catch (err) {
      toast.error('Failed to copy link')
    }
  }

  const parseSizeToBytes = (sizeStr) => {
    if (!sizeStr || typeof sizeStr !== 'string') return 0
    const match = sizeStr.match(/^([\d.]+)\s*([A-Z]+)$/)
    if (!match) return 0
    const value = parseFloat(match[1])
    const unit = match[2]
    const multipliers = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 }
    return value * (multipliers[unit] || 1)
  }

  const filteredDocs = documents
    .filter(d =>
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.originalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.type?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      if (sortField === 'date') {
        aVal = new Date(aVal || 0).getTime()
        bVal = new Date(bVal || 0).getTime()
      } else if (sortField === 'size') {
        aVal = parseSizeToBytes(a.size)
        bVal = parseSizeToBytes(b.size)
      } else {
        aVal = (aVal || '').toString().toLowerCase()
        bVal = (bVal || '').toString().toLowerCase()
      }
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1
      return aVal < bVal ? 1 : -1
    })

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diff = now - date
      if (diff < 86400000) return 'Today'
      if (diff < 172800000) return 'Yesterday'
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return 'Invalid Date'
    }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <SortAsc className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-40" />
    return sortOrder === 'asc'
      ? <SortAsc className="w-3.5 h-3.5 text-primary-400" />
      : <SortDesc className="w-3.5 h-3.5 text-primary-400" />
  }

  return (
    <div className="flex h-screen bg-dark-primary overflow-hidden">
      <Sidebar />
      <div className={'flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ' + (sidebarCollapsed ? 'ml-20' : 'ml-72')}>
        <Header />

        <div className="flex-1 flex flex-col overflow-hidden pt-14">
          {/* Header Section */}
          <div className="bg-dark-secondary border-b border-dark-tertiary flex-shrink-0">
            <div className="px-6 pt-5 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-text-primary">Documents</h1>
                <span className="px-2 py-0.5 bg-primary-500/10 text-primary-400 text-xs font-medium rounded-full">
                  {documents.length}
                </span>
              </div>
            </div>

            {/* KB badge */}
            <div className="px-6 pb-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-dark-tertiary rounded-lg border border-dark-hover">
                <FolderOpen className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-text-muted text-xs">KB:</span>
                <span className="text-primary-400 font-medium text-xs capitalize">{currentKB.replace(/-/g, ' ')}</span>
              </div>
            </div>

            {/* Search + Actions */}
            <div className="px-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-dark-tertiary border border-dark-hover rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
                  />
                </div>
                {selectedDocs.size > 0 && (
                  <div className="flex items-center gap-2 animate-slide-in">
                    <span className="px-2.5 py-1.5 bg-dark-tertiary rounded-lg border border-dark-hover text-xs text-text-primary font-medium">
                      {selectedDocs.size} selected
                    </span>
                    <button
                      onClick={handleBulkDownload}
                      className="px-3 py-1.5 bg-primary-500/15 text-primary-400 rounded-lg hover:bg-primary-500/25 flex items-center gap-1.5 transition-colors text-xs font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                    {user?.isAdmin && (
                      <button
                        onClick={() => setDeleteConfirm(true)}
                        className="px-3 py-1.5 bg-red-500/15 text-red-400 rounded-lg hover:bg-red-500/25 flex items-center gap-1.5 transition-colors text-xs font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="min-h-full">
              {loading ? (
                <div className="p-6">
                  <div className="bg-dark-secondary border border-dark-tertiary rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-dark-tertiary/50">
                        <tr>
                          <th className="w-10 px-4 py-2.5"><div className="w-4 h-4 rounded skeleton" /></th>
                          <th className="text-left px-4 py-2.5"><div className="w-12 h-3 rounded skeleton" /></th>
                          <th className="text-left px-4 py-2.5 w-24"><div className="w-10 h-3 rounded skeleton" /></th>
                          <th className="text-left px-4 py-2.5 w-24"><div className="w-8 h-3 rounded skeleton" /></th>
                          <th className="text-left px-4 py-2.5 w-32"><div className="w-16 h-3 rounded skeleton" /></th>
                          <th className="w-28 px-4 py-2.5"><div className="w-14 h-3 rounded skeleton mx-auto" /></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonRow key={i} />)}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                  <div className="w-14 h-14 rounded-xl bg-dark-tertiary flex items-center justify-center mb-4">
                    {searchTerm ? (
                      <Search className="w-6 h-6 text-text-muted" />
                    ) : (
                      <FileText className="w-6 h-6 text-text-muted" />
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary mb-1">
                    {searchTerm ? 'No documents found' : 'No documents yet'}
                  </h3>
                  <p className="text-xs text-text-muted max-w-xs">
                    {searchTerm ? 'Try a different search term or clear your filters' : 'Upload documents to this knowledge base to get started'}
                  </p>
                </div>
              ) : (
                <div className="p-6">
                  <div className="bg-dark-secondary border border-dark-tertiary rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-dark-tertiary">
                          <th className="w-10 px-4 py-2.5">
                            <button onClick={handleSelectAll} className="p-0.5 hover:bg-dark-hover rounded transition-colors">
                              {selectedDocs.size === filteredDocs.length && filteredDocs.length > 0 ? (
                                <CheckSquare className="w-4 h-4 text-primary-400" />
                              ) : (
                                <Square className="w-4 h-4 text-text-muted" />
                              )}
                            </button>
                          </th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-dark-hover/50 group transition-colors" onClick={() => handleSort('originalName')}>
                            <div className="flex items-center gap-1.5">Name <SortIcon field="originalName" /></div>
                          </th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-dark-hover/50 group transition-colors w-24" onClick={() => handleSort('type')}>
                            <div className="flex items-center gap-1.5">Type <SortIcon field="type" /></div>
                          </th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-dark-hover/50 group transition-colors w-24" onClick={() => handleSort('size')}>
                            <div className="flex items-center gap-1.5">Size <SortIcon field="size" /></div>
                          </th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-dark-hover/50 group transition-colors w-32" onClick={() => handleSort('date')}>
                            <div className="flex items-center gap-1.5">Modified <SortIcon field="date" /></div>
                          </th>
                          <th className="w-28 px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDocs.map((doc) => {
                          const fileStyle = getFileStyle(doc.type, doc.originalName)
                          return (
                            <tr
                              key={doc.s3Key}
                              className={'border-b border-dark-tertiary/50 hover:bg-dark-hover/30 transition-colors ' + (selectedDocs.has(doc.s3Key) ? 'bg-primary-500/5' : '')}
                            >
                              <td className="px-4 py-2.5">
                                <button onClick={() => handleSelectDoc(doc.s3Key)} className="p-0.5 hover:bg-dark-tertiary rounded transition-colors">
                                  {selectedDocs.has(doc.s3Key) ? (
                                    <CheckSquare className="w-4 h-4 text-primary-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-text-muted" />
                                  )}
                                </button>
                              </td>
                              <td className="px-4 py-2.5">
                                <button
                                  onClick={() => handlePreview(doc)}
                                  className="flex items-center gap-2.5 text-left hover:text-primary-400 transition-colors group"
                                >
                                  <div className={`w-8 h-8 rounded-lg ${fileStyle.bg} flex items-center justify-center flex-shrink-0`}>
                                    <FileText className={`w-4 h-4 ${fileStyle.color}`} />
                                  </div>
                                  <span className="text-sm text-text-primary group-hover:text-primary-400 transition-colors truncate max-w-xs">
                                    {doc.originalName}
                                  </span>
                                </button>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${fileStyle.bg} ${fileStyle.color}`}>
                                  {doc.type || 'FILE'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-text-muted text-xs">{doc.size || '0 B'}</td>
                              <td className="px-4 py-2.5 text-text-muted text-xs">{formatDate(doc.date)}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleCopyLink(doc)}
                                    className="p-1.5 hover:bg-dark-tertiary rounded-lg text-text-muted hover:text-primary-400 transition-colors"
                                    title="Copy link"
                                  >
                                    {copiedKey === doc.s3Key ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => setMetadataDoc(doc)}
                                    className="p-1.5 hover:bg-dark-tertiary rounded-lg text-text-muted hover:text-primary-400 transition-colors"
                                    title="Details"
                                  >
                                    <Info className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDownload(doc)}
                                    className="p-1.5 hover:bg-dark-tertiary rounded-lg text-text-muted hover:text-primary-400 transition-colors"
                                    title="Download"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Documents"
        message={`Are you sure you want to delete ${selectedDocs.size} document${selectedDocs.size > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-dark-secondary border border-dark-tertiary rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col elevation-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-tertiary flex-shrink-0">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2.5 flex-1 min-w-0">
                <FileText className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span className="truncate">{previewDoc.originalName}</span>
              </h2>
              <div className="flex items-center gap-1.5 ml-4 flex-shrink-0">
                {previewContent?.presignedUrl && (
                  <button
                    onClick={() => window.open(previewContent.presignedUrl, '_blank')}
                    className="px-3 py-1.5 bg-dark-tertiary text-text-primary rounded-lg hover:bg-dark-hover flex items-center gap-1.5 transition-colors text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open
                  </button>
                )}
                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="px-3 py-1.5 bg-primary-500/15 text-primary-400 rounded-lg hover:bg-primary-500/25 flex items-center gap-1.5 transition-colors text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button onClick={() => setPreviewDoc(null)} className="p-1.5 hover:bg-dark-hover rounded-lg transition-colors">
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-dark-primary">
              {previewLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-text-muted">Loading preview...</p>
                  </div>
                </div>
              ) : previewContent?.isTextFile ? (
                <div className="h-full overflow-auto p-6 scrollbar-thin">
                  <div className="bg-dark-tertiary rounded-xl p-6 max-w-5xl mx-auto">
                    <pre className="text-text-primary text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">
                      {previewContent.content}
                    </pre>
                  </div>
                </div>
              ) : previewContent?.presignedUrl && (previewDoc.type === 'PDF' || previewDoc.originalName?.toLowerCase().endsWith('.pdf')) ? (
                <iframe src={`${previewContent.presignedUrl}#toolbar=0&navpanes=0&view=FitH`} className="w-full h-full border-0" title={previewDoc.originalName} />
              ) : previewContent?.presignedUrl && (previewDoc.type === 'Word' || previewDoc.originalName?.toLowerCase().match(/\.(docx?|doc)$/)) ? (
                <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(previewContent.presignedUrl)}&embedded=true`} className="w-full h-full border-0" title={previewDoc.originalName} />
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 h-full px-6">
                  <div className="w-16 h-16 rounded-2xl bg-dark-tertiary flex items-center justify-center">
                    <FileText className="w-8 h-8 text-text-muted" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-text-primary mb-1">Preview Not Available</h3>
                    <p className="text-xs text-text-muted max-w-sm">Supported: PDF, Word, Text, Markdown, JSON, YAML</p>
                  </div>
                  <div className="flex gap-2">
                    {previewContent?.presignedUrl && (
                      <button
                        onClick={() => window.open(previewContent.presignedUrl, '_blank')}
                        className="px-4 py-2 bg-dark-tertiary text-text-primary rounded-lg hover:bg-dark-hover flex items-center gap-2 transition-colors text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open in New Tab
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(previewDoc)}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 transition-all text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metadata Modal */}
      {metadataDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setMetadataDoc(null)}>
          <div className="bg-dark-secondary border border-dark-tertiary rounded-2xl w-full max-w-lg flex flex-col elevation-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-tertiary">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Info className="w-4 h-4 text-primary-400" />
                Document Details
              </h2>
              <button onClick={() => setMetadataDoc(null)} className="p-1.5 hover:bg-dark-hover rounded-lg transition-colors">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <MetaField label="File Name" value={metadataDoc.originalName} span={2} />
                <MetaField label="Type" value={metadataDoc.type} />
                <MetaField label="Size" value={metadataDoc.size} />
                <MetaField label="Last Modified" value={formatDate(metadataDoc.date)} />
                <MetaField label="Knowledge Base" value={currentKB.replace(/-/g, ' ')} className="capitalize" />
                <div className="col-span-2">
                  <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">S3 Key</p>
                  <p className="text-xs text-text-primary font-mono bg-dark-tertiary px-3 py-2 rounded-lg break-all border border-dark-hover">
                    {metadataDoc.s3Key}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const MetaField = ({ label, value, span, className = '' }) => (
  <div className={span ? `col-span-${span}` : ''}>
    <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
    <p className={`text-sm text-text-primary ${className}`}>{value || 'N/A'}</p>
  </div>
)

export default DocumentsPage
