import React, { useState, useRef, useEffect } from 'react'
import { useChat } from '../../contexts/ChatContext'
import { useSettings } from '../../contexts/SettingsContext'
import { Send } from 'lucide-react'
import toast from 'react-hot-toast'

const BEDROCK_QUERY_ENDPOINT = import.meta.env.VITE_API_BASE + '/query-bedrock'

const InputArea = () => {
  const [message, setMessage] = useState('')
  const { addMessage, isLoading, setIsLoading } = useChat()
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

    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    setMessage('')

    addMessage('user', userMessage)
    setIsLoading(true)

    try {
      console.log('Querying Bedrock:', userMessage)

      const response = await fetch(BEDROCK_QUERY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage })
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Response data:', data)

      if (data.success && data.answer) {
        addMessage('assistant', data.answer, data.sources || [])
      } else {
        throw new Error(data.error || 'No answer received')
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error querying Bedrock:', error)
      toast.error('Failed to get response from AI')

      addMessage('assistant',
        `I'm having trouble connecting to the knowledge base right now. Error: ${error.message}`,
        []
      )
      setIsLoading(false)
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
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>Powered by <strong className="text-primary-500">AWS Bedrock</strong></span>
        </div>
      </div>
    </div>
  )
}

export default InputArea
