import React from 'react'

const ThinkingIndicator = () => (
  <div className="flex items-center gap-1.5">
    <div className="flex gap-1">
      <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
    <span className="text-xs text-text-muted">Thinking...</span>
  </div>
)

export default ThinkingIndicator
