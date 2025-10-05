import React from 'react'
import { useChat } from '../../contexts/ChatContext'
import { X, History, MessageCircle, Calendar, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const HistoryModal = ({ isOpen, onClose }) => {
  const { chatHistory, restoreChat, deleteChat } = useChat()

  if (!isOpen) return null

  const handleRestoreChat = (chat) => {
    restoreChat(chat)
    onClose()
    toast.success('Chat restored!')
  }

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation() // Prevent opening chat when deleting

    if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      deleteChat(chatId)
      toast.success('Chat deleted')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-dark-secondary border border-dark-tertiary rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col animate-slide-up shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-tertiary">
          <h2 className="text-xl font-semibold text-white flex items-center gap-3">
            <History className="w-6 h-6 text-primary-500" />
            Chat History
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <MessageCircle className="w-16 h-16 text-text-muted mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                No chat history yet
              </h3>
              <p className="text-text-secondary">
                Start a conversation to see your chat history here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className="bg-dark-tertiary border border-dark-hover rounded-lg p-4 hover:bg-dark-hover hover:border-primary-500 transition-all group relative"
                >
                  <button
                    onClick={() => handleRestoreChat(chat)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-text-primary font-semibold group-hover:text-primary-500 transition-colors line-clamp-1 pr-8">
                        {chat.title || 'Untitled Chat'}
                      </h4>
                      <span className="text-xs text-text-muted flex items-center gap-1 flex-shrink-0 ml-2">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(chat.timestamp), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-2">
                      {chat.preview || 'No preview available'}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-text-muted">
                        {chat.messages.length} messages
                      </span>
                      <span className="text-xs text-text-muted">•</span>
                      <span className="text-xs text-text-muted">
                        {format(new Date(chat.timestamp), 'h:mm a')}
                      </span>
                    </div>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="absolute top-4 right-4 p-2 bg-dark-primary hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete chat"
                  >
                    <Trash2 className="w-4 h-4 text-text-secondary hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HistoryModal
