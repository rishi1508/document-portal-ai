import React, { useState, useEffect } from 'react'
import { X, FileText, Download, Search, Calendar, ExternalLink, Loader, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import DocumentViewer from './DocumentViewer'
import { listDocuments } from '../../services/docService'
import { useAuth } from '../../contexts/AuthContext'

const DocumentsModal = ({ isOpen, onClose }) => {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingDoc, setViewingDoc] = useState(null)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFolder, setSelectedFolder] = useState('common-policies')

  // Map user departments to allowed folders (common-policies + department-specific)
  const getFolders = (department) => {
    const folderMap = {
      devops: [
        { id: 'common-policies', name: 'Common Policies' },
        { id: 'devops', name: 'DevOps' }
      ],
      platform: [
        { id: 'common-policies', name: 'Common Policies' },
        { id: 'platform-engineering', name: 'Platform Engineering' }
      ],
      solution: [
        { id: 'common-policies', name: 'Common Policies' },
        { id: 'solution-analysts', name: 'Solution Analysts' }
      ],
      product: [
        { id: 'common-policies', name: 'Common Policies' },
        { id: 'product-management', name: 'Product Management' }
      ]
    }

    return folderMap[department] || [{ id: 'common-policies', name: 'Common Policies' }]
  }

  const allowedFolders = getFolders(user?.department)

  useEffect(() => {
    if (isOpen) {
      setSelectedFolder('common-policies')
    }
  }, [isOpen])

  useEffect(() => {
    const fetchDocs = async () => {
      if (!isOpen) return

      setLoading(true)
      try {
        const documents = await listDocuments(selectedFolder)
        setDocs(documents)
      } catch (error) {
        console.error('Failed to load documents:', error)
        toast.error('Failed to load documents')
      } finally {
        setLoading(false)
      }
    }

    fetchDocs()
  }, [isOpen, selectedFolder])

  if (!isOpen) return null

  const filteredDocs = docs.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDocumentClick = (doc) => {
    setViewingDoc(doc)
  }

  const handleCloseViewer = () => {
    setViewingDoc(null)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-dark-secondary border border-dark-tertiary rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col animate-slide-up shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-dark-tertiary">
            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary-500" />
              Browse Documents
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          <div className="p-6 border-b border-dark-tertiary space-y-4">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-text-muted flex-shrink-0" />
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="flex-1 px-4 py-3 bg-dark-tertiary border border-dark-hover rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {allowedFolders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-3 bg-dark-tertiary border border-dark-hover rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
                  <p className="text-text-secondary">Loading documents from S3...</p>
                </div>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center text-text-secondary py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No documents found in {allowedFolders.find(f => f.id === selectedFolder)?.name}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleDocumentClick(doc)}
                    className="bg-dark-tertiary border border-dark-hover rounded-lg p-4 hover:bg-dark-hover hover:border-primary-500 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-text-primary font-semibold group-hover:text-primary-500 transition-colors">
                            {doc.name}
                          </h4>
                          <ExternalLink className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-text-secondary mt-1">
                          <span>{doc.type}</span>
                          <span>•</span>
                          <span>{doc.size}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {doc.date}
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 bg-primary-500/20 text-primary-500 text-xs rounded-full">
                            {doc.category}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDocumentClick(doc); }}
                        className="p-2 bg-dark-primary rounded-lg hover:bg-primary-500/20 transition-colors opacity-0 group-hover:opacity-100"
                        title="View document"
                      >
                        <Download className="w-5 h-5 text-text-secondary hover:text-primary-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {viewingDoc && (
        <DocumentViewer
          documentId={viewingDoc.id}
          documentName={viewingDoc.name}
          document={viewingDoc}
          onClose={handleCloseViewer}
        />
      )}
    </>
  )
}

export default DocumentsModal
