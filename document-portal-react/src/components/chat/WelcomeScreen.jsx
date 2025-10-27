import React, { useState } from 'react'  // Added useState for isSending
import { useChat } from '../../contexts/ChatContext'
import { useSettings } from '../../contexts/SettingsContext'
import { KNOWLEDGE_BASES } from '../../config/knowledgeBases'
import { Bot, Brain, Zap, Shield, Loader } from 'lucide-react'  // Added Loader
import toast from 'react-hot-toast'

const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_API || 'http://localhost:3200/api/chat'

const WelcomeScreen = () => {
  const { currentKB, addMessage } = useChat()  // Removed setIsLoading
  const { sidebarCollapsed } = useSettings()  // Only if needed; not used here
  const [isSending, setIsSending] = useState(false)  // Local loading state
  const kb = KNOWLEDGE_BASES[currentKB]

  const handlePromptClick = async (prompt) => {
    if (!prompt || isSending) return  // Guard against multiple clicks

    setIsSending(true)  // Local loading start

    // Add user message immediately
    addMessage('user', prompt, [])

    try {
      // Safe history
      const history = []  // Empty for new query; or getConversationHistory() if context

      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: prompt,
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

      // No setIsLoading(false) - local only
    } catch (error) {
      console.error('Error in example query:', error)
      toast.error('Failed to get AI response for example')
      addMessage('assistant',
        `Example query failed. Error: ${error.message}. Try typing your question instead.`,
        []
      )
    } finally {
      setIsSending(false)  // End local loading
    }
  }

  return (
    <div className="max-w-4xl mx-auto text-center w-full">
      <div className="mb-6">
        <div className="animate-float inline-block">
          <Bot className="w-16 h-16 mx-auto text-primary-500 mb-4" />
        </div>
      </div>

      <h2 className="text-3xl font-bold text-text-primary mb-3">
        Welcome to DocuMind AI
      </h2>
      <p className="text-base text-text-secondary mb-8">
        Your intelligent document assistant powered by AWS Bedrock
      </p>

      {kb && kb.prompts && kb.prompts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm text-text-secondary mb-3">
            Try asking about {kb.name}:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {kb.prompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handlePromptClick(prompt)}
                disabled={isSending}  // Disable during send
                className="bg-dark-secondary border border-dark-tertiary rounded-lg p-4 text-left hover:bg-dark-hover hover:border-primary-500 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"  // Disable styles
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    {isSending ? (
                      <Loader className="w-4 h-4 text-primary-500 animate-spin" />
                    ) : (
                      <Brain className="w-4 h-4 text-primary-500" />
                    )}
                  </div>
                  <span className="text-text-primary text-sm font-medium">{prompt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-secondary border border-dark-tertiary rounded-lg p-4">
          <Brain className="w-6 h-6 text-primary-500 mb-2 mx-auto" />
          <h4 className="font-semibold text-text-primary text-sm mb-1">AI-Powered Search</h4>
          <p className="text-xs text-text-secondary">Natural language understanding</p>
        </div>

        <div className="bg-dark-secondary border border-dark-tertiary rounded-lg p-4">
          <Zap className="w-6 h-6 text-yellow-500 mb-2 mx-auto" />
          <h4 className="font-semibold text-text-primary text-sm mb-1">Instant Answers</h4>
          <p className="text-xs text-text-secondary">Get responses in seconds</p>
        </div>

        <div className="bg-dark-secondary border border-dark-tertiary rounded-lg p-4">
          <Shield className="w-6 h-6 text-secondary-500 mb-2 mx-auto" />
          <h4 className="font-semibold text-text-primary text-sm mb-1">Secure & Private</h4>
          <p className="text-xs text-text-secondary">Your data stays protected</p>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen
