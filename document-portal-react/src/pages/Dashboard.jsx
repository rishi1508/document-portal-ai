import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useChat } from '../contexts/ChatContext'
import { useSettings } from '../contexts/SettingsContext'
import { useNotifications } from '../contexts/NotificationsContext'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import {
  FileText, MessageSquare, Upload, Search, TrendingUp,
  Clock, FolderOpen, Brain, ArrowRight, Sparkles,
  BarChart3, Activity, Shield, Zap, Database
} from 'lucide-react'
import { listDocuments } from '../services/docService'
import { KNOWLEDGE_BASES, ROLE_PERMISSIONS } from '../config/knowledgeBases'

const StatCard = ({ icon: Icon, label, value, subtext, color, delay }) => (
  <div
    className="bg-dark-secondary border border-dark-tertiary rounded-xl p-5 hover:border-primary-500/30 transition-all group"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs text-text-muted font-medium uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-2xl font-bold text-text-primary mb-0.5">{value}</p>
    {subtext && <p className="text-xs text-text-muted">{subtext}</p>}
  </div>
)

const SkeletonCard = () => (
  <div className="bg-dark-secondary border border-dark-tertiary rounded-xl p-5">
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-lg skeleton" />
      <div className="w-16 h-3 rounded skeleton" />
    </div>
    <div className="w-12 h-7 rounded skeleton mb-1" />
    <div className="w-24 h-3 rounded skeleton" />
  </div>
)

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentKB, chatHistory } = useChat()
  const { sidebarCollapsed } = useSettings()
  const { notifications } = useNotifications()
  const [docStats, setDocStats] = useState({ total: 0, byKB: {} })
  const [loading, setLoading] = useState(true)
  const [recentDocs, setRecentDocs] = useState([])

  const permissions = ROLE_PERMISSIONS[user?.department] || ROLE_PERMISSIONS.general
  const allowedKBs = permissions.knowledgeBases

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const allDocs = []
      const byKB = {}

      for (const kbId of allowedKBs) {
        try {
          const docs = await listDocuments(kbId)
          byKB[kbId] = docs.length
          allDocs.push(...docs.map(d => ({ ...d, kbId })))
        } catch {
          byKB[kbId] = 0
        }
      }

      allDocs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      setRecentDocs(allDocs.slice(0, 5))
      setDocStats({ total: allDocs.length, byKB })
    } catch (err) {
      console.error('Stats load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalChats = chatHistory?.length || 0
  const totalNotifs = notifications?.length || 0
  const greeting = getGreeting()

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric'
      })
    } catch {
      return ''
    }
  }

  const getFileIcon = (name) => {
    if (!name) return FileText
    const ext = name.split('.').pop()?.toLowerCase()
    return FileText
  }

  return (
    <div className="flex h-screen bg-dark-primary overflow-hidden">
      <Sidebar />
      <div className={'flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ' + (sidebarCollapsed ? 'ml-20' : 'ml-72')}>
        <Header />

        <div className="flex-1 overflow-y-auto pt-16 scrollbar-thin">
          <div className="max-w-6xl mx-auto px-6 py-8">
            {/* Welcome */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-text-primary mb-1">
                {greeting}, {user?.name?.split(' ')[0]}
              </h1>
              <p className="text-text-secondary">
                Here's what's happening with your knowledge bases today.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {loading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                <>
                  <StatCard
                    icon={FileText}
                    label="Documents"
                    value={docStats.total}
                    subtext={`Across ${allowedKBs.length} knowledge bases`}
                    color="bg-primary-500/15 text-primary-400"
                    delay={0}
                  />
                  <StatCard
                    icon={Database}
                    label="Knowledge Bases"
                    value={allowedKBs.length}
                    subtext="Available to your team"
                    color="bg-secondary-500/15 text-secondary-400"
                    delay={50}
                  />
                  <StatCard
                    icon={MessageSquare}
                    label="AI Chats"
                    value={totalChats}
                    subtext="Conversations saved"
                    color="bg-violet-500/15 text-violet-400"
                    delay={100}
                  />
                  <StatCard
                    icon={Activity}
                    label="Notifications"
                    value={totalNotifs}
                    subtext="System updates"
                    color="bg-amber-500/15 text-amber-400"
                    delay={150}
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Quick Actions</h2>

                <button
                  onClick={() => navigate('/chat')}
                  className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-primary-600/20 to-primary-500/10 border border-primary-500/20 rounded-xl hover:border-primary-500/40 transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
                    <Brain className="w-5 h-5 text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">Ask AI</p>
                    <p className="text-xs text-text-muted">Query your knowledge base</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  onClick={() => navigate('/documents')}
                  className="w-full flex items-center gap-4 p-4 bg-dark-secondary border border-dark-tertiary rounded-xl hover:border-primary-500/30 transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary-500/15 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-secondary-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">Browse Documents</p>
                    <p className="text-xs text-text-muted">View all files and folders</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  onClick={() => navigate('/documents')}
                  className="w-full flex items-center gap-4 p-4 bg-dark-secondary border border-dark-tertiary rounded-xl hover:border-primary-500/30 transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">Upload Document</p>
                    <p className="text-xs text-text-muted">Add to knowledge base</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* KB Breakdown */}
                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Documents by KB</h2>
                  <div className="bg-dark-secondary border border-dark-tertiary rounded-xl p-4 space-y-3">
                    {loading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="w-32 h-3 rounded skeleton" />
                            <div className="w-8 h-3 rounded skeleton" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      allowedKBs.map(kbId => {
                        const kb = KNOWLEDGE_BASES[kbId]
                        if (!kb) return null
                        const count = docStats.byKB[kbId] || 0
                        const pct = docStats.total > 0 ? (count / docStats.total * 100) : 0
                        return (
                          <div key={kbId}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-text-secondary">{kb.name}</span>
                              <span className="text-xs font-medium text-text-primary">{count}</span>
                            </div>
                            <div className="w-full h-1.5 bg-dark-tertiary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Recent Documents</h2>
                  <button
                    onClick={() => navigate('/documents')}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    View all
                  </button>
                </div>

                <div className="bg-dark-secondary border border-dark-tertiary rounded-xl overflow-hidden">
                  {loading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center gap-3 p-3">
                          <div className="w-8 h-8 rounded skeleton" />
                          <div className="flex-1 space-y-1.5">
                            <div className="w-48 h-3 rounded skeleton" />
                            <div className="w-24 h-2.5 rounded skeleton" />
                          </div>
                          <div className="w-16 h-3 rounded skeleton" />
                        </div>
                      ))}
                    </div>
                  ) : recentDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                      <div className="w-14 h-14 rounded-xl bg-dark-tertiary flex items-center justify-center mb-4">
                        <FileText className="w-7 h-7 text-text-muted" />
                      </div>
                      <h3 className="text-sm font-semibold text-text-primary mb-1">No documents yet</h3>
                      <p className="text-xs text-text-muted mb-4">Upload documents to get started with AI-powered search</p>
                      <button
                        onClick={() => navigate('/documents')}
                        className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
                      >
                        Go to Documents <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-dark-tertiary">
                      {recentDocs.map((doc, i) => (
                        <div
                          key={doc.s3Key || i}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-dark-hover/50 transition-colors cursor-pointer"
                          onClick={() => navigate('/documents')}
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-primary-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text-primary truncate">{doc.originalName || doc.name}</p>
                            <p className="text-xs text-text-muted">
                              {doc.size || ''}
                              {doc.kbId && ` \u00B7 ${KNOWLEDGE_BASES[doc.kbId]?.name || doc.kbId}`}
                            </p>
                          </div>
                          <span className="text-xs text-text-muted flex-shrink-0">{formatDate(doc.date)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Chats */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Recent Chats</h2>
                    <button
                      onClick={() => navigate('/chat')}
                      className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      New chat
                    </button>
                  </div>

                  <div className="bg-dark-secondary border border-dark-tertiary rounded-xl overflow-hidden">
                    {(!chatHistory || chatHistory.length === 0) ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                        <MessageSquare className="w-8 h-8 text-text-muted mb-3" />
                        <h3 className="text-sm font-semibold text-text-primary mb-1">No chats yet</h3>
                        <p className="text-xs text-text-muted">Start an AI conversation to search your docs</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-dark-tertiary">
                        {chatHistory.slice(0, 4).map((chat) => (
                          <div
                            key={chat.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-dark-hover/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/chat/${chat.id}`)}
                          >
                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="w-4 h-4 text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-text-primary truncate">{chat.title || 'Untitled Chat'}</p>
                              <p className="text-xs text-text-muted truncate">{chat.preview || 'No preview'}</p>
                            </div>
                            <span className="text-xs text-text-muted flex-shrink-0">
                              {chat.messages?.length || 0} msgs
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tech Highlights */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-dark-secondary border border-dark-tertiary rounded-xl p-4 text-center">
                    <Sparkles className="w-5 h-5 text-primary-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-text-primary">RAG Architecture</p>
                    <p className="text-[11px] text-text-muted mt-0.5">Vector embeddings + LLM</p>
                  </div>
                  <div className="bg-dark-secondary border border-dark-tertiary rounded-xl p-4 text-center">
                    <Zap className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-text-primary">Serverless</p>
                    <p className="text-[11px] text-text-muted mt-0.5">Lambda + API Gateway</p>
                  </div>
                  <div className="bg-dark-secondary border border-dark-tertiary rounded-xl p-4 text-center">
                    <Shield className="w-5 h-5 text-secondary-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-text-primary">Secure RBAC</p>
                    <p className="text-[11px] text-text-muted mt-0.5">Department-level access</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
