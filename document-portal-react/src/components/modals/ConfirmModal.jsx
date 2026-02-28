import React from 'react'
import { X, AlertTriangle } from 'lucide-react'

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => {
  if (!isOpen) return null

  const variantStyles = {
    danger: {
      button: 'bg-red-600 hover:bg-red-700 text-white',
      icon: 'text-red-400',
      border: 'border-red-500/20',
      bg: 'bg-red-500/10'
    },
    warning: {
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
      icon: 'text-amber-400',
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/10'
    },
    primary: {
      button: 'bg-primary-600 hover:bg-primary-700 text-white',
      icon: 'text-primary-400',
      border: 'border-primary-500/20',
      bg: 'bg-primary-500/10'
    }
  }

  const styles = variantStyles[variant] || variantStyles.danger

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in" onClick={onClose}>
      <div
        className="bg-dark-secondary border border-dark-tertiary rounded-2xl w-full max-w-sm elevation-3 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-tertiary">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-dark-hover rounded-lg transition-colors">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        <div className="p-5">
          <div className={`flex gap-3 p-3 ${styles.bg} border ${styles.border} rounded-lg`}>
            <AlertTriangle className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`} />
            <p className="text-sm text-text-primary leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-dark-tertiary">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-dark-tertiary border border-dark-hover text-text-primary rounded-lg hover:bg-dark-hover text-xs transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`px-4 py-2 rounded-lg text-xs transition-colors ${styles.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
