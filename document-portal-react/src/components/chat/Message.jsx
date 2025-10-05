import React from 'react'
import { User, Bot, FileText, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const Message = ({ message }) => {
  const isUser = message.type === 'user'

  const handleSourceClick = (source) => {
    toast.success('Opening document...')
    // In production, this would open the actual S3 signed URL
    console.log('Source URL:', source)
    // window.open(signedUrl, '_blank')
  }

  const formatContent = (content) => {
    // Split by double newlines for paragraphs
    const paragraphs = content.split('\n\n')

    return paragraphs.map((para, index) => {
      // Check if it's a heading (starts with **)
      if (para.startsWith('**') && para.includes(':**')) {
        const parts = para.split(':**')
        const heading = parts[0].replace(/\*\*/g, '')
        const text = parts.slice(1).join(':**')
        return (
          <div key={index} className="mb-3">
            <h4 className="font-bold text-white mb-1">{heading}:</h4>
            <p className="text-sm leading-relaxed">{text}</p>
          </div>
        )
      }

      // Check if it's a section heading (starts with ** but no colon)
      if (para.startsWith('**') && para.endsWith('**')) {
        return (
          <h4 key={index} className="font-bold text-white mb-2 mt-3">
            {para.replace(/\*\*/g, '')}
          </h4>
        )
      }

      // Check if it's a list item (starts with • or number)
      if (para.startsWith('•') || para.startsWith('**•')) {
        return (
          <div key={index} className="mb-1 pl-4">
            <p className="text-sm leading-relaxed">
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
            <div key={index} className="mb-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {match[1]}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-1">{match[2]}</h4>
                  <p className="text-sm leading-relaxed">{match[3]}</p>
                </div>
              </div>
            </div>
          )
        }
      }

      // Regular paragraph
      if (para.trim()) {
        // Handle inline bold text
        const parts = para.split(/\*\*(.+?)\*\*/)
        return (
          <p key={index} className="text-sm leading-relaxed mb-2">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="font-semibold text-white">{part}</strong> : part
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
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-gradient-to-br from-primary-500 to-primary-600' 
          : 'bg-gradient-to-br from-secondary-500 to-secondary-600'
      }`}>
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-lg p-4 ${
          isUser
            ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'
            : 'bg-dark-secondary border border-dark-tertiary text-text-primary'
        }`}>
          <div className="whitespace-pre-wrap">
            {isUser ? message.content : formatContent(message.content)}
          </div>
        </div>

        <div className="text-xs text-text-muted mt-1 px-1">
          {format(new Date(message.timestamp), 'h:mm a')}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 bg-dark-tertiary border border-dark-hover rounded-lg p-3 w-full">
            <h4 className="text-xs font-semibold text-text-muted mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Sources Referenced
            </h4>
            <div className="space-y-1">
              {message.sources.map((source, index) => (
                <button
                  key={index}
                  onClick={() => handleSourceClick(source)}
                  className="flex items-center gap-2 text-xs text-primary-500 hover:text-primary-400 hover:underline transition-colors group w-full text-left"
                >
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>{source.split('/').pop()}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Message
