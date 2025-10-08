import React from 'react'
import { X, AlertTriangle } from 'lucide-react'

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => {
 if (!isOpen) return null

 const variantStyles = {
 danger: {
 button: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-text-primary',
 icon: 'text-red-500',
 border: 'border-red-500/30',
 bg: 'bg-red-500/10'
 },
 warning: {
 button: 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-text-primary',
 icon: 'text-yellow-500',
 border: 'border-yellow-500/30',
 bg: 'bg-yellow-500/10'
 },
 primary: {
 button: 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-text-primary',
 icon: 'text-primary-500',
 border: 'border-primary-500/30',
 bg: 'bg-primary-500/10'
 }
 }

 const styles = variantStyles[variant] || variantStyles.danger

 return (
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
 <div 
 className="bg-dark-secondary border border-dark-tertiary rounded-xl w-full max-w-md shadow-2xl animate-scale-in"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-center justify-between p-6 border-b border-dark-tertiary">
 <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
 <button onClick={onClose} className="p-2 hover:bg-dark-hover rounded-lg transition-colors">
 <X className="w-5 h-5 text-text-secondary" />
 </button>
 </div>

 <div className="p-6">
 <div className={`flex gap-4 p-4 ${styles.bg} border ${styles.border} rounded-lg`}>
 <AlertTriangle className={`w-6 h-6 ${styles.icon} flex-shrink-0 mt-0.5`} />
 <p className="text-text-primary">{message}</p>
 </div>
 </div>

 <div className="flex items-center justify-end gap-3 p-6 border-t border-dark-tertiary">
 <button
 onClick={onClose}
 className="px-6 py-2 bg-dark-tertiary border border-dark-hover text-text-primary rounded-lg hover:bg-dark-hover transition-colors"
 >
 {cancelText}
 </button>
 <button
 onClick={() => {
 onConfirm()
 onClose()
 }}
 className={`px-6 py-2 rounded-lg transition-colors ${styles.button}`}
 >
 {confirmText}
 </button>
 </div>
 </div>
 </div>
 )
}

export default ConfirmModal
