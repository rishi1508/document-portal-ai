import React from 'react'
import { User, Bot, FileText, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import ThinkingIndicator from './ThinkingIndicator'

const Message = ({ message }) => {
  const isUser = message.type === 'user'

  const handleSourceClick = async (source) => {
    try {
      const parts = source.split(' | ')
      const filename = parts[0]
      const department = parts[1] || 'common-policies'
      
      const s3Key = `${department}/${filename}`
      
      const toastId = toast.loading('Opening document...')
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/get-document?s3Key=${encodeURIComponent(s3Key)}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to load document')
      }
      
      const data = await response.json()
      
      toast.dismiss(toastId)
      
      if (data.presignedUrl) {
        window.open(data.presignedUrl, '_blank')
      } else {
        throw new Error('No URL received')
      }
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to open document')
      console.error('Source click error:', error)
    }
  }

  const formatContent = (content) => {
    const paragraphs = content.split('\n\n')

    return paragraphs.map((para, index) => {
      // Check if it's a heading (starts with **)
      if (para.startsWith('**') && para.includes(':**')) {
        const parts = para.split(':**')
        const heading = parts[0].replace(/\*\*/g, '')
        const text = parts.slice(1).join(':**')
        return (
          <div key={index} className="mb-4">
            <h4 className="font-bold text-text-primary mb-2 text-base">{heading}:</h4>
            <p className="text-base leading-relaxed">{text}</p>
          </div>
        )
      }

      // Check if it's a section heading (starts with ** but no colon)
      if (para.startsWith('**') && para.endsWith('**')) {
        return (
          <h4 key={index} className="font-bold text-text-primary mb-3 mt-4 text-base">
            {para.replace(/\*\*/g, '')}
          </h4>
        )
      }

      // Check if it's a list item (starts with • or number)
      if (para.startsWith('•') || para.startsWith('**•')) {
        return (
          <div key={index} className="mb-2 pl-4">
            <p className="text-base leading-relaxed">
              {para.replace(/\*\*/g, '').replace('•', '').trim()}
            </p>
          </div>
        )
      }

      // Check if it's a numbered step
      if (/^\*\*\d+\./.test(para)) {
        const match = para.match(/^\*\*(\d+)\.\s*(.+?)\*\*(.*)/)
        if (match) {
          return (
            <div key={index} className="mb-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center text-text-primary font-bold text-base">
                  {match[1]}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-text-primary mb-2 text-base">{match[2]}</h4>
                  <p className="text-base leading-relaxed">{match[3]}</p>
                </div>
              </div>
            </div>
          )
        }
      }

      // Regular paragraph
      if (para.trim()) {
        const parts = para.split(/\*\*(.+?)\*\*/)
        return (
          <p key={index} className="text-base leading-relaxed mb-3">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="font-semibold text-text-primary">{part}</strong> : part
            )}
          </p>
        )
      }

      return null
    }).filter(Boolean)
  }

  return (
    <div className={`flex gap-4 animate-slide-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-gradient-to-br from-primary-500 to-primary-600' 
          : 'bg-gradient-to-br from-secondary-500 to-secondary-600'
      }`}>
        {isUser ? (
          <User className="w-5 h-5 text-text-primary" />
        ) : (
          <Bot className="w-5 h-5 text-text-primary" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-lg p-5 ${
          isUser
            ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-text-primary'
            : 'bg-dark-secondary border border-dark-tertiary text-text-primary'
        }`}>
          <div className="whitespace-pre-wrap">
            {isUser ? (
              <span className="text-base leading-relaxed">{message.content}</span>
            ) : message.content.length === 0 ? (
              <ThinkingIndicator />
            ) : (
              formatContent(message.content)
            )}
          </div>
        </div>

        <div className="text-xs text-text-muted mt-2 px-1">
          {format(new Date(message.timestamp), 'h:mm a')}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 bg-dark-tertiary border border-dark-hover rounded-lg p-4 w-full">
            <h4 className="text-sm font-semibold text-text-muted mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Sources Referenced
            </h4>
            <div className="space-y-2">
              {message.sources.map((source, index) => {
                const displayName = source.split(' | ')[0]
                
                return (
                  <button
                    key={index}
                    onClick={() => handleSourceClick(source)}
                    className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-400 hover:underline transition-colors group w-full text-left"
                  >
                    <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span>{displayName}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Message
