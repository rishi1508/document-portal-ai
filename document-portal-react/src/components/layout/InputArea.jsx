import React, { useState, useRef, useEffect } from 'react'
import { useChat } from '../../contexts/ChatContext'
import { useSettings } from '../../contexts/SettingsContext'
import { Send, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_API || 'http://localhost:3200/api/chat'

const InputArea = () => {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const { addMessage, updateStreamingMessage, getConversationHistory, currentKB } = useChat()
  const { sidebarCollapsed } = useSettings()
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [message])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!message.trim() || isSending) return

    const userMessage = message.trim()
    setMessage('')
    setIsSending(true)

    addMessage('user', userMessage)

    // Add thinking placeholder
    const thinkingMsg = addMessage('assistant', '', [], true)  // tempMsg=true

    try {
      console.log('Querying Chat API:', userMessage, '| KB:', currentKB)

      const history = getConversationHistory() || []

      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: userMessage,
          conversationHistory: history,
          kbId: currentKB,
          stream: true  // Request streaming
        })
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Stream response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedAnswer = ''
      let sources = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(l => l.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            if (data.token) {
              accumulatedAnswer += data.token
              updateStreamingMessage(accumulatedAnswer, sources)
            }
            if (data.done) {
              sources = data.sources || []
              updateStreamingMessage(accumulatedAnswer, sources)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error querying Chat API:', error)
      toast.error('Failed to get response from AI')

      updateStreamingMessage(
        `I'm having trouble connecting to the knowledge base right now. Error: ${error.message}`,
        []
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      className={'fixed bottom-0 bg-dark-secondary border-t border-dark-tertiary p-6 z-30 transition-all duration-300 right-0 ' + (
        sidebarCollapsed ? 'left-20' : 'left-72'
      )}
    >
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end gap-3 bg-dark-tertiary border-2 border-dark-hover focus-within:border-primary-500 rounded-xl p-3 transition-colors">
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
              className="flex-1 bg-transparent border-none outline-none text-text-primary resize-none py-2 max-h-[200px]"
              style={{ minHeight: '24px' }}
              disabled={isSending}
            />

            <button
              type="submit"
              disabled={!message.trim() || isSending}
              className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-text-primary p-2 rounded-lg transition-all flex-shrink-0 flex items-center justify-center"
            >
              {isSending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>Powered by <strong className="text-primary-500">DocuMind AI</strong></span>
        </div>
      </div>
    </div>
  )
}

export default InputArea
