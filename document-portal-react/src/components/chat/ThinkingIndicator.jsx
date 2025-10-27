import React from 'react'
import { Loader } from 'lucide-react'

const ThinkingIndicator = () => (
  <div className="flex items-center gap-2 text-text-secondary animate-pulse">
    <Loader className="w-4 h-4 animate-spin text-primary-500" />
    <span className="text-sm">Thinking...</span>
  </div>
)

export default ThinkingIndicator
