import React, { useEffect, useState } from 'react'
import { X, CheckCircle2, XCircle, Loader, FileText, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { listPendingApprovals, approveRequest, rejectRequest } from '../../services/docService'
import ConfirmModal from './ConfirmModal'

const ApprovalsModal = ({ isOpen, onClose }) => {
 const [items, setItems] = useState([])
 const [nextToken, setNextToken] = useState(null)
 const [loading, setLoading] = useState(true)
 const [actioning, setActioning] = useState(null)
 const [rejectConfirm, setRejectConfirm] = useState(null)

 useEffect(() => {
 if (!isOpen) return
 setItems([])
 setNextToken(null)
 setLoading(true)
 ;(async () => {
 try {
 const res = await listPendingApprovals(50, null)
 setItems(res.items || [])
 setNextToken(res.nextToken || null)
 } catch (e) {
 console.error(e)
 toast.error('Failed to load pending approvals')
 } finally {
 setLoading(false)
 }
 })()
 }, [isOpen])

 const loadMore = async () => {
 if (!nextToken) return
 setLoading(true)
 try {
 const res = await listPendingApprovals(50, nextToken)
 setItems((prev) => [...prev, ...(res.items || [])])
 setNextToken(res.nextToken || null)
 } catch (e) {
 console.error(e)
 toast.error('Failed to load more')
 } finally {
 setLoading(false)
 }
 }

 const handleApprove = async (id) => {
 setActioning(id)
 try {
 await approveRequest(id)
 setItems((prev) => prev.filter((x) => x.requestId !== id))
 toast.success('Document approved and synced to Knowledge Base')
 } catch (e) {
 console.error(e)
 toast.error('Approve failed')
 } finally {
 setActioning(null)
 }
 }

 const handleReject = async (id) => {
 setActioning(id)
 try {
 await rejectRequest(id, 'Rejected by admin')
 setItems((prev) => prev.filter((x) => x.requestId !== id))
 toast.success('Document rejected')
 setRejectConfirm(null)
 } catch (e) {
 console.error(e)
 toast.error('Reject failed')
 } finally {
 setActioning(null)
 }
 }

 if (!isOpen) return null

 return (
 <>
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-dark-secondary border border-dark-tertiary rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
 <div className="flex items-center justify-between p-6 border-b border-dark-tertiary">
 <h2 className="text-xl font-semibold text-text-primary">Pending Approvals</h2>
 <button onClick={onClose} className="p-2 hover:bg-dark-hover rounded-lg">
 <X className="w-5 h-5 text-text-secondary" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-6">
 {loading && items.length === 0 ? (
 <div className="flex items-center justify-center h-64">
 <div className="text-center">
 <Loader className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
 <p className="text-text-secondary">Loading pending requests…</p>
 </div>
 </div>
 ) : items.length === 0 ? (
 <div className="text-center text-text-secondary py-12">
 <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
 <p>No pending requests</p>
 </div>
 ) : (
 <div className="space-y-3">
 {items.map((it) => (
 <div key={it.requestId} className="bg-dark-tertiary border border-dark-hover rounded-lg p-4">
 <div className="flex items-start justify-between gap-4">
 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <FileText className="w-5 h-5 text-primary-500" />
 <h4 className="text-text-primary font-semibold truncate">{it.title || it.originalName}</h4>
 </div>
 <div className="text-xs text-text-secondary mt-1">
 <span>{it.kbGroup}</span>
 <span className="mx-2">•</span>
 <span>{it.contentType}</span>
 </div>
 {it.description && <p className="text-sm text-text-secondary mt-2">{it.description}</p>}
 </div>
 <div className="flex items-center gap-2">
 <button
 disabled={actioning === it.requestId}
 onClick={() => handleApprove(it.requestId)}
 className="px-3 py-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 disabled:opacity-50 transition-colors"
 title="Approve"
 >
 <CheckCircle2 className="w-5 h-5" />
 </button>
 <button
 disabled={actioning === it.requestId}
 onClick={() => setRejectConfirm(it.requestId)}
 className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 disabled:opacity-50 transition-colors"
 title="Reject"
 >
 <XCircle className="w-5 h-5" />
 </button>
 </div>
 </div>
 </div>
 ))}
 {nextToken && (
 <div className="flex justify-center pt-2">
 <button
 disabled={loading}
 onClick={loadMore}
 className="px-4 py-2 bg-dark-tertiary border border-dark-hover text-text-primary rounded-lg hover:bg-dark-hover disabled:opacity-50 flex items-center gap-2"
 >
 <ChevronDown className="w-4 h-4" />
 Load more
 </button>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 </div>

 <ConfirmModal
 isOpen={rejectConfirm !== null}
 onClose={() => setRejectConfirm(null)}
 onConfirm={() => handleReject(rejectConfirm)}
 title="Reject Document"
 message="Are you sure you want to reject this document upload request? This action cannot be undone."
 confirmText="Reject"
 cancelText="Cancel"
 variant="warning"
 />
 </>
 )
}

export default ApprovalsModal
