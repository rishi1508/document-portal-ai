import React from 'react'
import { User, Bot, FileText, ExternalLink, Copy } from 'lucide-react'
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

      if (!response.ok) throw new Error('Failed to load document')

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

  const handleCopyContent = () => {
    navigator.clipboard.writeText(message.content)
    toast.success('Copied to clipboard')
  }

  const formatContent = (content) => {
    const paragraphs = content.split('\n\n')

    return paragraphs.map((para, index) => {
      // Heading with colon
      if (para.startsWith('**') && para.includes(':**')) {
        const parts = para.split(':**')
        const heading = parts[0].replace(/\*\*/g, '')
        const text = parts.slice(1).join(':**')
        return (
          <div key={index} className="mb-3">
            <h4 className="font-semibold text-text-primary mb-1.5 text-[13px]">{heading}:</h4>
            <p className="text-[13px] leading-relaxed">{text}</p>
          </div>
        )
      }

      // Section heading
      if (para.startsWith('**') && para.endsWith('**')) {
        return (
          <h4 key={index} className="font-semibold text-text-primary mb-2 mt-3 text-[13px]">
            {para.replace(/\*\*/g, '')}
          </h4>
        )
      }

      // Bullet list
      if (para.startsWith('\u2022') || para.startsWith('**\u2022')) {
        return (
          <div key={index} className="mb-1.5 pl-3 flex gap-2">
            <span className="text-primary-400 text-[13px]">\u2022</span>
            <p className="text-[13px] leading-relaxed flex-1">
              {para.replace(/\*\*/g, '').replace('\u2022', '').trim()}
            </p>
          </div>
        )
      }

      // Numbered step
      if (/^\*\*\d+\./.test(para)) {
        const match = para.match(/^\*\*(\d+)\.\s*(.+?)\*\*(.*)/)
        if (match) {
          return (
            <div key={index} className="mb-3 flex gap-2.5">
              <div className="flex-shrink-0 w-6 h-6 bg-primary-500/15 rounded-full flex items-center justify-center text-primary-400 text-xs font-bold mt-0.5">
                {match[1]}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-text-primary text-[13px] mb-0.5">{match[2]}</h4>
                <p className="text-[13px] leading-relaxed">{match[3]}</p>
              </div>
            </div>
          )
        }
      }

      // Regular paragraph with bold parsing
      if (para.trim()) {
        const parts = para.split(/\*\*(.+?)\*\*/)
        return (
          <p key={index} className="text-[13px] leading-relaxed mb-2.5">
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
    <div className={`flex gap-3 animate-slide-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isUser
          ? 'bg-gradient-to-br from-primary-500 to-primary-700'
          : 'bg-gradient-to-br from-secondary-500 to-secondary-700'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-xl px-4 py-3 group relative ${
          isUser
            ? 'bg-primary-600 text-white'
            : 'bg-dark-secondary border border-dark-tertiary text-text-secondary'
        }`}>
          <div className="whitespace-pre-wrap">
            {isUser ? (
              <span className="text-[13px] leading-relaxed">{message.content}</span>
            ) : message.content.length === 0 ? (
              <ThinkingIndicator />
            ) : (
              formatContent(message.content)
            )}
          </div>

          {/* Copy button for assistant messages */}
          {!isUser && message.content.length > 0 && (
            <button
              onClick={handleCopyContent}
              className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-dark-hover transition-all"
              title="Copy"
            >
              <Copy className="w-3 h-3 text-text-muted" />
            </button>
          )}
        </div>

        <div className="text-[10px] text-text-muted mt-1 px-1">
          {format(new Date(message.timestamp), 'h:mm a')}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 bg-dark-tertiary/50 border border-dark-hover rounded-lg p-3 w-full">
            <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3 h-3" />
              Sources
            </h4>
            <div className="space-y-1">
              {message.sources.map((source, index) => {
                const displayName = source.split(' | ')[0]
                return (
                  <button
                    key={index}
                    onClick={() => handleSourceClick(source)}
                    className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors group w-full text-left"
                  >
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    <span className="truncate">{displayName}</span>
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
