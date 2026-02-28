import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import { Shield, FileText, Users, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { listPendingApprovals } from '../services/docService'

const Admin = () => {
  const { user } = useAuth()
  const { sidebarCollapsed } = useSettings()
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPending()
  }, [])

  const loadPending = async () => {
    try {
      const res = await listPendingApprovals(50, null)
      setPendingCount(res.items?.length || 0)
    } catch {
      setPendingCount(0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-dark-primary overflow-hidden">
      <Sidebar />
      <div className={'flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ' + (sidebarCollapsed ? 'ml-20' : 'ml-72')}>
        <Header />
        <div className="flex-1 overflow-y-auto pt-14 scrollbar-thin">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-text-primary">Admin Dashboard</h1>
                <p className="text-xs text-text-muted">Manage documents and approvals</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-dark-secondary border border-dark-tertiary rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Pending</span>
                </div>
                <p className="text-2xl font-bold text-text-primary">
                  {loading ? <span className="w-8 h-6 inline-block skeleton rounded" /> : pendingCount}
                </p>
                <p className="text-xs text-text-muted mt-0.5">Awaiting review</p>
              </div>

              <div className="bg-dark-secondary border border-dark-tertiary rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-primary-400" />
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Role</span>
                </div>
                <p className="text-2xl font-bold text-text-primary">{user?.role}</p>
                <p className="text-xs text-text-muted mt-0.5 capitalize">{user?.department?.replace(/-/g, ' ')}</p>
              </div>

              <div className="bg-dark-secondary border border-dark-tertiary rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-5 h-5 text-secondary-400" />
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Status</span>
                </div>
                <p className="text-2xl font-bold text-secondary-400">Active</p>
                <p className="text-xs text-text-muted mt-0.5">System operational</p>
              </div>
            </div>

            <div className="bg-dark-secondary border border-dark-tertiary rounded-xl p-6">
              <h2 className="text-sm font-semibold text-text-primary mb-3">Admin Actions</h2>
              <p className="text-xs text-text-muted">
                Use the Approvals panel in the sidebar to review and approve pending document uploads.
                Approved documents are automatically synced to the knowledge base and indexed for AI search.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin
