import React, { useState } from 'react'
import { useChat } from '../../contexts/ChatContext'
import { KNOWLEDGE_BASES } from '../../config/knowledgeBases'
import { Bot, Brain, Zap, Shield, Loader, Sparkles, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_API || 'http://localhost:3200/api/chat'

const WelcomeScreen = () => {
  const { currentKB, addMessage } = useChat()
  const [isSending, setIsSending] = useState(false)
  const [activePrompt, setActivePrompt] = useState(null)
  const kb = KNOWLEDGE_BASES[currentKB]

  const handlePromptClick = async (prompt) => {
    if (!prompt || isSending) return

    setIsSending(true)
    setActivePrompt(prompt)
    addMessage('user', prompt, [])

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: prompt,
          conversationHistory: [],
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
      console.error('Error in example query:', error)
      toast.error('Failed to get AI response')
      addMessage('assistant',
        `Sorry, I couldn't process that query right now. Please try typing your question manually.`,
        []
      )
    } finally {
      setIsSending(false)
      setActivePrompt(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto text-center w-full">
      {/* Hero */}
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/20 mb-4">
          <Bot className="w-7 h-7 text-primary-400" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">
          How can I help you today?
        </h2>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          Ask questions in natural language and get instant answers from your knowledge base.
        </p>
      </div>

      {/* Example Prompts */}
      {kb && kb.prompts && kb.prompts.length > 0 && (
        <div className="mb-8">
          <p className="text-xs text-text-muted mb-3 uppercase tracking-wider font-medium">
            Try asking about {kb.name}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {kb.prompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handlePromptClick(prompt)}
                disabled={isSending}
                className="bg-dark-secondary border border-dark-tertiary rounded-xl p-3.5 text-left hover:border-primary-500/30 hover:bg-dark-hover/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {isSending && activePrompt === prompt ? (
                      <Loader className="w-3.5 h-3.5 text-primary-400 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                    )}
                  </div>
                  <span className="text-sm text-text-primary leading-relaxed">{prompt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-dark-secondary/50 border border-dark-tertiary rounded-xl p-3">
          <Brain className="w-5 h-5 text-primary-400 mb-1.5 mx-auto" />
          <p className="text-xs font-medium text-text-primary">RAG Search</p>
          <p className="text-[10px] text-text-muted mt-0.5">Vector + LLM</p>
        </div>
        <div className="bg-dark-secondary/50 border border-dark-tertiary rounded-xl p-3">
          <Zap className="w-5 h-5 text-amber-400 mb-1.5 mx-auto" />
          <p className="text-xs font-medium text-text-primary">Instant</p>
          <p className="text-[10px] text-text-muted mt-0.5">Sub-second answers</p>
        </div>
        <div className="bg-dark-secondary/50 border border-dark-tertiary rounded-xl p-3">
          <Shield className="w-5 h-5 text-secondary-400 mb-1.5 mx-auto" />
          <p className="text-xs font-medium text-text-primary">Secure</p>
          <p className="text-[10px] text-text-muted mt-0.5">RBAC protected</p>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen
