import React, { useState } from 'react'
import { useChat } from '../../contexts/ChatContext'
import { useNavigate } from 'react-router-dom'
import { X, History, MessageCircle, Calendar, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import ConfirmModal from './ConfirmModal'

const KB_NAMES = {
  'common-policies': 'Common Policies',
  'devops': 'DevOps',
  'platform-engineering': 'Platform Engineering',
  'product-management': 'Product Management',
  'solution-analysts': 'Solution Analysts',
}

const HistoryModal = ({ isOpen, onClose }) => {
  const { chatHistory, loadChatById, deleteChat } = useChat()
  const navigate = useNavigate()
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  if (!isOpen) return null

  const handleRestoreChat = (chat) => {
    const loaded = loadChatById(chat.id)
    if (loaded) {
      navigate(`/chat/${chat.id}`)
      onClose()
      toast.success('Chat restored')
    } else {
      toast.error('Failed to load chat')
    }
  }

  const handleDeleteChat = (chatId) => {
    deleteChat(chatId)
    toast.success('Chat deleted')
    setDeleteConfirm(null)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-dark-secondary border border-dark-tertiary rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col elevation-3 animate-slide-up">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-tertiary">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <History className="w-4 h-4 text-primary-400" />
              Chat History
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-dark-hover rounded-lg transition-colors">
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            {chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <MessageCircle className="w-10 h-10 text-text-muted mb-3" />
                <h3 className="text-sm font-semibold text-text-primary mb-1">No chat history</h3>
                <p className="text-xs text-text-muted">Start a conversation to see it here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className="bg-dark-tertiary border border-dark-hover rounded-xl p-3.5 hover:border-primary-500/20 transition-all group relative"
                  >
                    <button
                      onClick={() => handleRestoreChat(chat)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <h4 className="text-sm text-text-primary font-medium group-hover:text-primary-400 transition-colors line-clamp-1 pr-8">
                          {chat.title || 'Untitled Chat'}
                        </h4>
                        <span className="text-[10px] text-text-muted flex items-center gap-1 flex-shrink-0 ml-2">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(chat.timestamp), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted line-clamp-1 mb-2">
                        {chat.preview || 'No preview'}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 bg-dark-hover rounded text-text-muted">
                          {KB_NAMES[chat.kbId] || 'Unknown'}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {chat.messages?.length || 0} messages
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(chat.id) }}
                      className="absolute top-3 right-3 p-1.5 bg-dark-primary/50 hover:bg-red-500/15 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-text-muted hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => handleDeleteChat(deleteConfirm)}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  )
}

export default HistoryModal
