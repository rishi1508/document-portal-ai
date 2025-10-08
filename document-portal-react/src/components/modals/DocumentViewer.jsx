import React, { useState, useEffect } from 'react'
import { X, Download, FileText, Loader, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const GET_DOC_ENDPOINT = 'https://5gek16ypz1.execute-api.ap-south-1.amazonaws.com/test/get-document'

const DocumentViewer = ({ documentId, documentName, document, onClose }) => {
 const [loading, setLoading] = useState(true)
 const [content, setContent] = useState('')
 const [error, setError] = useState(null)
 const [presignedUrl, setPresignedUrl] = useState(null)
 const [isTextFile, setIsTextFile] = useState(false)
 const [viewerUrl, setViewerUrl] = useState(null)

 useEffect(() => {
 fetchDocument()
 }, [document])

 const getFileType = () => {
 const name = (document?.originalName || documentName || '').toLowerCase()
 if (name.endsWith('.pdf')) return 'pdf'
 if (name.endsWith('.docx') || name.endsWith('.doc')) return 'docx'
 if (name.endsWith('.txt')) return 'txt'
 if (name.endsWith('.md')) return 'md'
 return 'other'
 }

 const fetchDocument = async () => {
 setLoading(true)
 setError(null)

 try {
 if (document?.s3Key) {
 const response = await fetch(GET_DOC_ENDPOINT + '?s3Key=' + encodeURIComponent(document.s3Key))

 if (!response.ok) {
 throw new Error('Failed to fetch document')
 }

 const data = await response.json()

 if (data.isTextFile && data.content) {
 // Text files - show inline
 setContent(data.content)
 setIsTextFile(true)
 setPresignedUrl(data.presignedUrl)
 setLoading(false)
 } else {
 // Binary files (PDF, DOCX)
 setPresignedUrl(data.presignedUrl)
 setIsTextFile(false)

 const fileType = getFileType()

 if (fileType === 'pdf') {
 // PDF can be embedded directly
 setViewerUrl(data.presignedUrl)
 } else if (fileType === 'docx') {
 // Use Google Docs Viewer for DOCX
 const encodedUrl = encodeURIComponent(data.presignedUrl)
 setViewerUrl(`https://docs.google.com/gview?url=${encodedUrl}&embedded=true`)
 }

 setLoading(false)
 }
 } else {
 setContent('Document preview not available')
 setIsTextFile(true)
 setLoading(false)
 }
 } catch (err) {
 console.error('Error fetching document:', err)
 setError('Failed to load document')
 setLoading(false)
 toast.error('Failed to load document')
 }
 }

 const handleDownload = async () => {
 try {
 if (presignedUrl) {
 const link = document.createElement('a')
 link.href = presignedUrl
 link.download = document?.originalName || documentName || 'document'
 document.body.appendChild(link)
 link.click()
 document.body.removeChild(link)
 toast.success('Downloaded ' + documentName)
 } else if (content) {
 const blob = new Blob([content], { type: 'text/plain' })
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a')
 a.href = url
 a.download = document?.originalName || documentName || 'document.txt'
 document.body.appendChild(a)
 a.click()
 document.body.removeChild(a)
 URL.revokeObjectURL(url)
 toast.success('Downloaded ' + documentName)
 }
 } catch (error) {
 toast.error('Download failed')
 }
 }

 const handleOpenOriginal = () => {
 if (presignedUrl) {
 window.open(presignedUrl, '_blank')
 toast.success('Opened in new tab')
 }
 }

 return (
 <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-dark-secondary border border-dark-tertiary rounded-xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl">
 <div className="flex items-center justify-between p-6 border-b border-dark-tertiary">
 <div className="flex items-center gap-3 flex-1 min-w-0">
 <FileText className="w-6 h-6 text-primary-500 flex-shrink-0" />
 <div className="min-w-0 flex-1">
 <h2 className="text-xl font-semibold text-text-primary truncate">{documentName}</h2>
 </div>
 </div>
 <div className="flex items-center gap-2">
 {presignedUrl && (
 <button
 onClick={handleOpenOriginal}
 className="p-2 bg-dark-tertiary hover:bg-dark-hover rounded-lg transition-colors"
 title="Open original file"
 >
 <ExternalLink className="w-5 h-5 text-text-secondary" />
 </button>
 )}
 <button
 onClick={handleDownload}
 className="p-2 bg-dark-tertiary hover:bg-dark-hover rounded-lg transition-colors"
 title="Download"
 >
 <Download className="w-5 h-5 text-text-secondary" />
 </button>
 <button
 onClick={onClose}
 className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
 >
 <X className="w-5 h-5 text-text-secondary" />
 </button>
 </div>
 </div>

 <div className="flex-1 overflow-hidden bg-dark-primary">
 {loading ? (
 <div className="flex items-center justify-center h-full">
 <div className="text-center">
 <Loader className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
 <p className="text-text-secondary">Loading document...</p>
 </div>
 </div>
 ) : error ? (
 <div className="text-center text-red-500 p-8">
 <p>{error}</p>
 </div>
 ) : isTextFile && content ? (
 <div className="p-8 overflow-y-auto h-full">
 <div className="prose prose-invert max-w-none">
 <pre className="whitespace-pre-wrap font-sans text-text-primary leading-relaxed">
 {content}
 </pre>
 </div>
 </div>
 ) : viewerUrl ? (
 <iframe
 src={viewerUrl}
 className="w-full h-full border-0"
 title={documentName}
 />
 ) : (
 <div className="flex flex-col items-center justify-center h-full p-8">
 <FileText className="w-24 h-24 text-primary-500 mb-4" />
 <h3 className="text-xl font-semibold text-text-primary mb-2">
 Preview Not Available
 </h3>
 <p className="text-text-secondary mb-6 text-center max-w-md">
 This document type cannot be previewed. Please download to view.
 </p>
 <button
 onClick={handleDownload}
 className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-text-primary rounded-lg hover:bg-primary-600 transition-colors"
 >
 <Download className="w-5 h-5" />
 Download
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 )
}

export default DocumentViewer
