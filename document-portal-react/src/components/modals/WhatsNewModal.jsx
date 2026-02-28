import React from 'react'
import { X, Sparkles, Zap, Shield, BarChart3, Upload, MessageSquare } from 'lucide-react'

const WhatsNewModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  const features = [
    {
      icon: BarChart3,
      title: 'Enterprise Dashboard',
      description: 'Real-time stats, document analytics, and activity feed at a glance',
      color: 'text-primary-400',
      tag: 'New'
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Search',
      description: 'RAG architecture with vector embeddings for accurate document retrieval',
      color: 'text-violet-400',
      tag: null
    },
    {
      icon: Upload,
      title: 'Bulk Upload',
      description: 'Drag & drop up to 50 files with real-time progress tracking',
      color: 'text-amber-400',
      tag: 'Improved'
    },
    {
      icon: MessageSquare,
      title: 'Smart Chat',
      description: 'Conversation history, auto-titles, and source citations',
      color: 'text-secondary-400',
      tag: null
    },
    {
      icon: Shield,
      title: 'Secure RBAC',
      description: 'Department-level access control for knowledge bases',
      color: 'text-red-400',
      tag: null
    },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-dark-secondary border border-dark-tertiary rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col elevation-3 animate-slide-up">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-tertiary">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-400" />
            What's New
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-dark-hover rounded-lg transition-colors">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-dark-tertiary border border-dark-hover rounded-xl hover:border-primary-500/20 transition-all"
              >
                <div className="w-9 h-9 bg-dark-hover rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className={`w-[18px] h-[18px] ${feature.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-medium text-text-primary">{feature.title}</h3>
                    {feature.tag && (
                      <span className="px-1.5 py-0.5 bg-primary-500/15 text-primary-400 text-[9px] font-bold rounded uppercase">
                        {feature.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border border-primary-500/20 rounded-xl">
            <h3 className="text-sm font-medium text-text-primary mb-1">More Coming Soon</h3>
            <p className="text-xs text-text-muted">
              We're constantly improving DocuMind. Stay tuned for document versioning, export features, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WhatsNewModal
