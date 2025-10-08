import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import {
  Search, Download, Trash2, FileText, SortAsc, SortDesc, Loader, Eye,
  CheckSquare, Square, X, ExternalLink, Info
} from 'lucide-react'
import { listDocuments, deleteDocuments } from '../services/docService'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/modals/ConfirmModal'

const DocumentsPage = () => {
  const { user } = useAuth()
  const { currentKB, sidebarCollapsed } = useSettings()
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

  const handleMetadata = (doc) => {
    setMetadataDoc(doc)
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

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <SortAsc className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-50" />
    return sortOrder === 'asc'
      ? <SortAsc className="w-4 h-4 text-primary-500" />
      : <SortDesc className="w-4 h-4 text-primary-500" />
  }

  return (
    <div className="flex h-screen bg-dark-primary overflow-hidden">
      <Sidebar />

      {/* FIXED: Proper flex container without extra margin */}
      <div className={'flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ' + (sidebarCollapsed ? 'ml-20' : 'ml-72')}>
        <Header />

        {/* Main Content - Full width - PT-16 to account for fixed header */}
        <div className="flex-1 flex flex-col overflow-hidden pt-16">

          {/* Header Section - Extra padding to be fully visible */}
          <div className="bg-dark-secondary border-b border-dark-tertiary flex-shrink-0">
            {/* Top row - Title and count */}
            <div className="px-6 pt-6 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-white">Documents</h1>
                <span className="px-3 py-1 bg-primary-500/10 text-primary-500 text-sm font-medium rounded-full">
                  {documents.length} {documents.length !== 1 ? 'documents' : 'document'}
                </span>
              </div>
            </div>

            {/* Knowledge Base badge */}
            <div className="px-6 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-dark-tertiary rounded-lg border border-dark-hover">
                <FileText className="w-4 h-4 text-primary-500" />
                <span className="text-text-secondary text-sm">Knowledge Base:</span>
                <span className="text-primary-500 font-medium text-sm capitalize">
                  {currentKB.replace(/-/g, ' ')}
                </span>
              </div>
            </div>

            {/* Search and Actions */}
            <div className="px-6 pb-6">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-dark-tertiary border border-dark-hover rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  />
                </div>

                {selectedDocs.size > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-2 bg-dark-tertiary rounded-lg border border-dark-hover">
                      <span className="text-sm text-text-primary font-medium">
                        {selectedDocs.size} selected
                      </span>
                    </div>
                    <button
                      onClick={handleBulkDownload}
                      className="px-4 py-2.5 bg-primary-500/20 text-primary-500 rounded-lg hover:bg-primary-500/30 flex items-center gap-2 transition-colors font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    {user?.isAdmin && (
                      <button
                        onClick={() => setDeleteConfirm(true)}
                        className="px-4 py-2.5 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 flex items-center gap-2 transition-colors font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>




          {/* Table Container - FIXED: Full width, proper scroll */}
          <div className="flex-1 overflow-y-auto">
            <div className="min-h-full">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                  <FileText className="w-16 h-16 text-text-muted mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    {searchTerm ? 'No documents found' : 'No documents yet'}
                  </h3>
                  <p className="text-text-secondary">
                    {searchTerm ? 'Try a different search term' : 'Upload documents to get started'}
                  </p>
                </div>
              ) : (
                <div className="p-6">
                  <div className="bg-dark-secondary border border-dark-tertiary rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-dark-tertiary border-b border-dark-hover">
                        <tr>
                          <th className="w-12 px-4 py-3">
                            <button onClick={handleSelectAll} className="p-1 hover:bg-dark-hover rounded transition-colors">
                              {selectedDocs.size === filteredDocs.length && filteredDocs.length > 0 ? (
                                <CheckSquare className="w-5 h-5 text-primary-500" />
                              ) : (
                                <Square className="w-5 h-5 text-text-muted" />
                              )}
                            </button>
                          </th>
                          <th
                            className="text-left px-4 py-3 text-text-primary font-semibold cursor-pointer hover:bg-dark-hover group transition-colors"
                            onClick={() => handleSort('originalName')}
                          >
                            <div className="flex items-center gap-2">
                              Name
                              <SortIcon field="originalName" />
                            </div>
                          </th>
                          <th
                            className="text-left px-4 py-3 text-text-primary font-semibold cursor-pointer hover:bg-dark-hover group transition-colors w-32"
                            onClick={() => handleSort('type')}
                          >
                            <div className="flex items-center gap-2">
                              Type
                              <SortIcon field="type" />
                            </div>
                          </th>
                          <th
                            className="text-left px-4 py-3 text-text-primary font-semibold cursor-pointer hover:bg-dark-hover group transition-colors w-32"
                            onClick={() => handleSort('size')}
                          >
                            <div className="flex items-center gap-2">
                              Size
                              <SortIcon field="size" />
                            </div>
                          </th>
                          <th
                            className="text-left px-4 py-3 text-text-primary font-semibold cursor-pointer hover:bg-dark-hover group transition-colors w-40"
                            onClick={() => handleSort('date')}
                          >
                            <div className="flex items-center gap-2">
                              Date Modified
                              <SortIcon field="date" />
                            </div>
                          </th>
                          <th className="w-32 px-4 py-3 text-text-primary font-semibold text-center">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDocs.map((doc) => (
                          <tr
                            key={doc.s3Key}
                            className="border-b border-dark-hover hover:bg-dark-hover/50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleSelectDoc(doc.s3Key)}
                                className="p-1 hover:bg-dark-tertiary rounded transition-colors"
                              >
                                {selectedDocs.has(doc.s3Key) ? (
                                  <CheckSquare className="w-5 h-5 text-primary-500" />
                                ) : (
                                  <Square className="w-5 h-5 text-text-muted" />
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handlePreview(doc)}
                                className="flex items-center gap-3 text-left hover:text-primary-500 transition-colors group"
                              >
                                <FileText className="w-5 h-5 text-primary-500 flex-shrink-0" />
                                <span className="text-text-primary group-hover:text-primary-500 transition-colors">
                                  {doc.originalName}
                                </span>
                              </button>
                            </td>
                            <td className="px-4 py-3 text-text-secondary text-sm">
                              {doc.type || 'FILE'}
                            </td>
                            <td className="px-4 py-3 text-text-secondary text-sm">
                              {doc.size || '0 B'}
                            </td>
                            <td className="px-4 py-3 text-text-secondary text-sm">
                              {formatDate(doc.date)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleMetadata(doc)}
                                  className="p-2 hover:bg-dark-tertiary rounded-lg text-text-secondary hover:text-primary-500 transition-colors"
                                  title="View Details"
                                >
                                  <Info className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDownload(doc)}
                                  className="p-2 hover:bg-dark-tertiary rounded-lg text-text-secondary hover:text-primary-500 transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
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
        message={`Are you sure you want to delete ${selectedDocs.size} document${selectedDocs.size > 1 ? 's' : ''}? This action cannot be undone and will remove documents from the knowledge base.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Preview Modal - FIXED: Google Docs Viewer for Word */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-dark-secondary border border-dark-tertiary rounded-xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-dark-tertiary flex-shrink-0">
              <h2 className="text-xl font-semibold text-white flex items-center gap-3 flex-1 min-w-0">
                <FileText className="w-6 h-6 text-primary-500 flex-shrink-0" />
                <span className="truncate">{previewDoc.originalName}</span>
              </h2>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                {previewContent?.presignedUrl && (
                  <button
                    onClick={() => window.open(previewContent.presignedUrl, '_blank')}
                    className="px-4 py-2 bg-dark-tertiary text-text-primary rounded-lg hover:bg-dark-hover flex items-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </button>
                )}
                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="px-4 py-2 bg-primary-500/20 text-primary-500 rounded-lg hover:bg-primary-500/30 flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-dark-hover rounded-lg transition-colors">
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-dark-primary">
              {previewLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
                    <p className="text-text-secondary">Loading preview...</p>
                  </div>
                </div>
              ) : previewContent?.isTextFile ? (
                <div className="h-full overflow-auto p-6">
                  <div className="bg-dark-tertiary rounded-lg p-6 max-w-5xl mx-auto">
                    <pre className="text-text-primary text-sm font-mono whitespace-pre-wrap break-words">
                      {previewContent.content}
                    </pre>
                  </div>
                </div>
              ) : previewContent?.presignedUrl && (previewDoc.type === 'PDF' || previewDoc.originalName.toLowerCase().endsWith('.pdf')) ? (
                <iframe
                  src={`${previewContent.presignedUrl}#toolbar=0&navpanes=0&view=FitH`}
                  className="w-full h-full border-0"
                  title={previewDoc.originalName}
                />
              ) : previewContent?.presignedUrl && (previewDoc.type === 'Word' || previewDoc.originalName.toLowerCase().match(/\.(docx?|doc)$/)) ? (
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(previewContent.presignedUrl)}&embedded=true`}
                  className="w-full h-full border-0"
                  title={previewDoc.originalName}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-6 h-full px-6">
                  <div className="text-center">
                    <FileText className="w-20 h-20 text-text-muted opacity-50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                      Preview Not Available
                    </h3>
                    <p className="text-text-secondary mb-1">
                      This file type cannot be previewed in the browser
                    </p>
                    <p className="text-text-muted text-sm max-w-md">
                      Supported formats: PDF, Word (DOCX/DOC), Text, Markdown, JSON, YAML
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {previewContent?.presignedUrl && (
                      <button
                        onClick={() => window.open(previewContent.presignedUrl, '_blank')}
                        className="px-6 py-3 bg-dark-tertiary text-text-primary rounded-lg hover:bg-dark-hover flex items-center gap-2 transition-colors"
                      >
                        <ExternalLink className="w-5 h-5" />
                        Open in New Tab
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(previewDoc)}
                      className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-primary-500/20"
                    >
                      <Download className="w-5 h-5" />
                      Download to View
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
          <div className="bg-dark-secondary border border-dark-tertiary rounded-xl w-full max-w-2xl flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-dark-tertiary">
              <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                <Info className="w-6 h-6 text-primary-500" />
                Document Details
              </h2>
              <button onClick={() => setMetadataDoc(null)} className="p-2 hover:bg-dark-hover rounded-lg transition-colors">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-text-muted text-sm mb-1">File Name</p>
                  <p className="text-text-primary break-all">{metadataDoc.originalName}</p>
                </div>
                <div>
                  <p className="text-text-muted text-sm mb-1">Type</p>
                  <p className="text-text-primary">{metadataDoc.type}</p>
                </div>
                <div>
                  <p className="text-text-muted text-sm mb-1">Size</p>
                  <p className="text-text-primary">{metadataDoc.size}</p>
                </div>
                <div>
                  <p className="text-text-muted text-sm mb-1">Last Modified</p>
                  <p className="text-text-primary">{formatDate(metadataDoc.date)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-text-muted text-sm mb-1">Knowledge Base</p>
                  <p className="text-text-primary capitalize">{currentKB.replace(/-/g, ' ')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-text-muted text-sm mb-1">S3 Key</p>
                  <p className="text-text-primary text-sm font-mono bg-dark-tertiary p-3 rounded break-all">{metadataDoc.s3Key}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentsPage
