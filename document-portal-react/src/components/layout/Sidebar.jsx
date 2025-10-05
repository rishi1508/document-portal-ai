import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useChat } from '../../contexts/ChatContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useNotifications } from '../../contexts/NotificationsContext'
import { KNOWLEDGE_BASES, ROLE_PERMISSIONS } from '../../config/knowledgeBases'
import { 
  Brain, ChevronLeft, Plus, History, FolderOpen, 
  Upload, Settings, LogOut, Shield, Server, Lightbulb, Bell, CheckCircle2
} from 'lucide-react'
import SettingsModal from '../modals/SettingsModal'
import DocumentsModal from '../modals/DocumentsModal'
import UploadModal from '../modals/UploadModal'
import HistoryModal from '../modals/HistoryModal'
import WhatsNewModal from '../modals/WhatsNewModal'
import ApprovalsModal from '../modals/ApprovalsModal'
import toast from 'react-hot-toast'

const iconMap = {
  CodeBranch: Server,
  Server: Server,
  Lightbulb: Lightbulb,
  Shield: Shield,
}

const Sidebar = () => {
  const { user, logout } = useAuth()
  const { currentKB, setCurrentKB, startNewChat } = useChat()
  const { sidebarCollapsed, toggleSidebar } = useSettings()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [approvalsOpen, setApprovalsOpen] = useState(false)

  const permissions = ROLE_PERMISSIONS[user?.department] || ROLE_PERMISSIONS.devops
  const allowedKBs = permissions.knowledgeBases

  const handleNewChat = () => {
    startNewChat()
    toast.success('New chat started')
  }

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout()
    }
  }

  return (
    <>
      <aside 
        className={'fixed left-0 top-0 h-screen bg-dark-secondary border-r border-dark-tertiary flex flex-col transition-all duration-300 z-50 ' + (
          sidebarCollapsed ? 'w-20' : 'w-72'
        )}
      >
        <div className="p-6 border-b border-dark-tertiary flex items-center justify-between">
          <div className={'flex items-center gap-3 overflow-hidden ' + (sidebarCollapsed && 'hidden')}>
            <Brain className="w-6 h-6 text-primary-500 flex-shrink-0" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent whitespace-nowrap">
              DocuMind
            </span>
          </div>
          <button
            onClick={toggleSidebar}
            className={'p-2 hover:bg-dark-hover rounded-lg transition-all ' + (sidebarCollapsed && 'rotate-180')}
          >
            <ChevronLeft className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            {!sidebarCollapsed && (
              <h3 className="text-xs font-semibold text-text-muted uppercase mb-3 px-3">
                Knowledge Base
              </h3>
            )}
            <div className="space-y-1">
              {allowedKBs.map((kbId) => {
                const kb = KNOWLEDGE_BASES[kbId]
                if (!kb) return null

                const Icon = iconMap[kb.icon] || Server
                const isActive = currentKB === kbId

                return (
                  <button
                    key={kbId}
                    onClick={() => setCurrentKB(kbId)}
                    className={'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ' + (
                      isActive
                        ? 'bg-primary-500/20 text-primary-500 border-l-3 border-primary-500'
                        : 'text-text-secondary hover:bg-dark-hover hover:text-text-primary'
                    ) + (sidebarCollapsed ? ' justify-center' : '')}
                    title={sidebarCollapsed ? kb.name : ''}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="flex-1 text-left text-sm">{kb.name}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            {!sidebarCollapsed && (
              <h3 className="text-xs font-semibold text-text-muted uppercase mb-3 px-3">
                Quick Actions
              </h3>
            )}
            <div className="space-y-1">
              <NavItem 
                icon={Plus} 
                label="New Chat" 
                collapsed={sidebarCollapsed}
                onClick={handleNewChat}
              />
              <NavItem 
                icon={History} 
                label="Chat History" 
                collapsed={sidebarCollapsed}
                onClick={() => setHistoryOpen(true)}
              />
              <NavItem 
                icon={FolderOpen} 
                label="Documents" 
                collapsed={sidebarCollapsed}
                onClick={() => setDocumentsOpen(true)}
              />
              <NavItem 
                icon={Upload} 
                label="Upload" 
                collapsed={sidebarCollapsed}
                onClick={() => setUploadOpen(true)}
              />
              <NavItem
                icon={Bell}
                label="What's new"
                collapsed={sidebarCollapsed}
                onClick={() => setWhatsNewOpen(true)}
              />
              {user?.isAdmin && (
                <NavItem
                  icon={CheckCircle2}
                  label="Approvals"
                  collapsed={sidebarCollapsed}
                  onClick={() => setApprovalsOpen(true)}
                />
              )}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-dark-tertiary space-y-1">
          <NavItem 
            icon={Settings} 
            label="Settings" 
            collapsed={sidebarCollapsed}
            onClick={() => setSettingsOpen(true)}
          />
          <button
            onClick={handleLogout}
            className={'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:bg-dark-hover hover:text-text-primary transition-all ' + (
              sidebarCollapsed && 'justify-center'
            )}
            title={sidebarCollapsed ? 'Logout' : ''}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DocumentsModal isOpen={documentsOpen} onClose={() => setDocumentsOpen(false)} />
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <HistoryModal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
      <WhatsNewModal isOpen={whatsNewOpen} onClose={() => setWhatsNewOpen(false)} />
      <ApprovalsModal isOpen={approvalsOpen} onClose={() => setApprovalsOpen(false)} />
    </>
  )
}

const NavItem = ({ icon: Icon, label, collapsed, onClick, badge }) => (
  <button
    onClick={onClick}
    className={'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:bg-dark-hover hover:text-text-primary transition-all relative ' + (
      collapsed && 'justify-center'
    )}
    title={collapsed ? label : ''}
  >
    <Icon className="w-5 h-5 flex-shrink-0" />
    {!collapsed && <span className="text-sm flex-1 text-left">{label}</span>}
    {badge > 0 && (
      <span className={'absolute bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px] px-1 ' + (
        collapsed ? '-top-1 -right-1' : 'right-2'
      )}>
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </button>
)

export default Sidebar
