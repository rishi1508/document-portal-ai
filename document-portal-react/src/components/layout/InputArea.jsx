import React, { useState, useRef, useEffect } from 'react'
import { useChat } from '../../contexts/ChatContext'
import { useSettings } from '../../contexts/SettingsContext'
import { Send, Loader, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_API || 'http://localhost:3200/api/chat'

const InputArea = () => {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const { addMessage, getConversationHistory, currentKB } = useChat()
  const { sidebarCollapsed } = useSettings()
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [message])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim() || isSending) return

    const userMessage = message.trim()
    setMessage('')
    setIsSending(true)
    addMessage('user', userMessage)

    try {
      const history = getConversationHistory() || []
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          conversationHistory: history,
          kbId: currentKB
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.answer) {
        addMessage('assistant', data.answer, data.sources || [])
      } else {
        throw new Error(data.error || 'No answer received')
      }
    } catch (error) {
      console.error('Error querying Chat API:', error)
      toast.error('Failed to get response from AI')
      addMessage('assistant',
        `I'm having trouble connecting to the knowledge base right now. Please try again in a moment.`,
        []
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      className={'fixed bottom-0 glass border-t border-dark-tertiary p-4 z-30 transition-all duration-300 right-0 ' + (
        sidebarCollapsed ? 'left-20' : 'left-72'
      )}
    >
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end gap-2 bg-dark-tertiary border border-dark-hover focus-within:border-primary-500/50 focus-within:ring-1 focus-within:ring-primary-500/20 rounded-xl p-2.5 transition-all">
            <textarea
              id="message-input"
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              placeholder="Ask me anything about your documents..."
              rows={1}
              className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary resize-none py-1.5 px-1 max-h-[160px] placeholder-text-muted"
              style={{ minHeight: '24px' }}
              disabled={isSending}
            />

            <button
              type="submit"
              disabled={!message.trim() || isSending}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-dark-hover disabled:text-text-muted text-white p-2 rounded-lg transition-all flex-shrink-0 flex items-center justify-center"
            >
              {isSending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between mt-1.5 text-[10px] text-text-muted px-1">
          <span>Enter to send, Shift+Enter for new line</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary-500" />
            Powered by DocuMind AI
          </span>
        </div>
      </div>
    </div>
  )
}

export default InputArea
