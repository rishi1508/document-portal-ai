import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useChat } from '../../contexts/ChatContext'
import { KNOWLEDGE_BASES, ROLE_PERMISSIONS } from '../../config/knowledgeBases'
import {
  Brain, ChevronRight, FolderOpen, MessageSquare, History,
  Upload, Settings, LogOut, Shield, Server, Lightbulb, CheckCircle2, Plus,
  LayoutDashboard, Sparkles, Database
} from 'lucide-react'
import SettingsModal from '../modals/SettingsModal'
import UploadModal from '../modals/UploadModal'
import HistoryModal from '../modals/HistoryModal'
import WhatsNewModal from '../modals/WhatsNewModal'
import ApprovalsModal from '../modals/ApprovalsModal'
import ConfirmModal from '../modals/ConfirmModal'

const iconMap = {
  CodeBranch: Server,
  Server: Server,
  Lightbulb: Lightbulb,
  Shield: Shield,
  FileText: Database,
}

const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { sidebarCollapsed, toggleSidebar } = useSettings()
  const { currentKB, switchKB, startNewChat } = useChat()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [approvalsOpen, setApprovalsOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const permissions = ROLE_PERMISSIONS[user?.department] || ROLE_PERMISSIONS.devops
  const allowedKBs = permissions.knowledgeBases

  const isActive = (path) => location.pathname === path
  const isActivePrefix = (path) => location.pathname.startsWith(path)

  const handleSidebarClick = (e) => {
    if (!sidebarCollapsed) return
    const isInteractive = e.target.closest && e.target.closest('button, a, input, select, textarea, [role="button"]')
    if (!isInteractive) toggleSidebar()
  }

  const handleNewChat = (e) => {
    e.stopPropagation()
    startNewChat()
    navigate('/chat')
  }

  const handleKBClick = (kbId) => (e) => {
    e.stopPropagation()
    switchKB(kbId)
    if (location.pathname !== '/documents') {
      navigate('/chat')
    }
  }

  const handleLogout = () => logout()

  return (
    <>
      <aside
        onClick={handleSidebarClick}
        className={
          'fixed left-0 top-0 h-screen border-r border-dark-tertiary flex flex-col transition-all duration-300 z-50 ' +
          (sidebarCollapsed
            ? 'w-20 bg-dark-secondary cursor-pointer'
            : 'w-72 bg-dark-secondary')
        }
      >
        {/* Logo */}
        <div className="h-14 px-4 border-b border-dark-tertiary flex items-center justify-between flex-shrink-0">
          {sidebarCollapsed ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleSidebar() }}
              className="w-full flex justify-center p-2 hover:bg-dark-hover rounded-lg transition-all"
              title="Expand Sidebar"
            >
              <Brain className="w-5 h-5 text-primary-500" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-bold gradient-text whitespace-nowrap">
                  DocuMind
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); toggleSidebar() }}
                className="p-1.5 hover:bg-dark-hover rounded-lg transition-all"
                title="Collapse Sidebar"
              >
                <ChevronRight className="w-4 h-4 text-text-muted transform rotate-180" />
              </button>
            </>
          )}
        </div>

        <nav
          className="flex-1 px-3 py-3 overflow-y-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Main Navigation */}
          <div className="mb-4">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2 px-2">
                Navigation
              </p>
            )}
            <div className="space-y-0.5">
              <NavItem
                icon={LayoutDashboard}
                label="Dashboard"
                collapsed={sidebarCollapsed}
                active={isActive('/dashboard') || isActive('/')}
                onClick={(e) => { e.stopPropagation(); navigate('/dashboard') }}
              />
              <NavItem
                icon={FolderOpen}
                label="Documents"
                collapsed={sidebarCollapsed}
                active={isActive('/documents')}
                onClick={(e) => { e.stopPropagation(); navigate('/documents') }}
              />

              {/* AI Chat with New Chat */}
              {sidebarCollapsed ? (
                <NavItem
                  icon={MessageSquare}
                  label="AI Chat"
                  shortLabel="Chat"
                  collapsed={sidebarCollapsed}
                  active={isActivePrefix('/chat')}
                  onClick={(e) => { e.stopPropagation(); navigate('/chat') }}
                />
              ) : (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/chat') }}
                    className={
                      'flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-sm ' +
                      (isActivePrefix('/chat')
                        ? 'bg-primary-500/15 text-primary-400 font-medium'
                        : 'text-text-secondary hover:bg-dark-hover hover:text-text-primary')
                    }
                  >
                    <MessageSquare className="w-[18px] h-[18px] flex-shrink-0" />
                    <span className="flex-1 text-left">AI Chat</span>
                  </button>
                  <button
                    onClick={handleNewChat}
                    className="p-2 hover:bg-dark-hover rounded-lg transition-colors group"
                    title="New Chat"
                  >
                    <Plus className="w-4 h-4 text-text-muted group-hover:text-primary-400" />
                  </button>
                </div>
              )}

              <NavItem
                icon={History}
                label="History"
                collapsed={sidebarCollapsed}
                onClick={(e) => { e.stopPropagation(); setHistoryOpen(true) }}
              />
              <NavItem
                icon={Upload}
                label="Upload"
                collapsed={sidebarCollapsed}
                onClick={(e) => { e.stopPropagation(); setUploadOpen(true) }}
              />
            </div>
          </div>

          {/* Admin */}
          {user?.isAdmin && (
            <div className="mb-4">
              {!sidebarCollapsed && (
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2 px-2">
                  Admin
                </p>
              )}
              {sidebarCollapsed && <div className="h-px bg-dark-tertiary my-2 mx-2" />}
              <NavItem
                icon={CheckCircle2}
                label="Approvals"
                collapsed={sidebarCollapsed}
                onClick={(e) => { e.stopPropagation(); setApprovalsOpen(true) }}
              />
            </div>
          )}

          {/* Knowledge Base */}
          <div className="mb-4">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2 px-2">
                Knowledge Base
              </p>
            )}
            {sidebarCollapsed && <div className="h-px bg-dark-tertiary my-2 mx-2" />}
            <div className="space-y-0.5">
              {allowedKBs.map((kbId) => {
                const kb = KNOWLEDGE_BASES[kbId]
                if (!kb) return null
                const Icon = iconMap[kb.icon] || Database
                const isKBActive = currentKB === kbId

                return sidebarCollapsed ? (
                  <button
                    key={kbId}
                    onClick={handleKBClick(kbId)}
                    className="group w-full flex flex-col items-center gap-0.5 px-1 py-2 rounded-lg transition-colors hover:bg-dark-hover"
                    title={kb.name}
                  >
                    <Icon className={`w-[18px] h-[18px] ${isKBActive ? 'text-primary-400' : 'text-text-muted'}`} />
                    <span className={`text-[9px] text-center leading-tight ${isKBActive ? 'text-primary-400 font-medium' : 'text-text-muted'}`}>
                      {kb.name.split(' ')[0]}
                    </span>
                  </button>
                ) : (
                  <button
                    key={kbId}
                    onClick={handleKBClick(kbId)}
                    className={
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-sm ' +
                      (isKBActive
                        ? 'bg-primary-500/15 text-primary-400 font-medium'
                        : 'text-text-secondary hover:bg-dark-hover hover:text-text-primary')
                    }
                    title={kb.name}
                  >
                    <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{kb.name}</span>
                    {isKBActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            {!sidebarCollapsed && (
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2 px-2">
                Quick Links
              </p>
            )}
            {sidebarCollapsed && <div className="h-px bg-dark-tertiary my-2 mx-2" />}
            <NavItem
              icon={Sparkles}
              label="What's New"
              shortLabel="New"
              collapsed={sidebarCollapsed}
              onClick={(e) => { e.stopPropagation(); setWhatsNewOpen(true) }}
            />
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-dark-tertiary space-y-0.5 flex-shrink-0">
          <NavItem
            icon={Settings}
            label="Settings"
            collapsed={sidebarCollapsed}
            onClick={(e) => { e.stopPropagation(); setSettingsOpen(true) }}
          />
          <button
            onClick={(e) => { e.stopPropagation(); setShowLogoutConfirm(true) }}
            className={
              'w-full flex items-center text-text-muted hover:text-red-400 transition-colors ' +
              (sidebarCollapsed
                ? 'flex-col gap-0.5 px-1 py-2 rounded-lg hover:bg-dark-hover'
                : 'gap-2.5 px-2.5 py-2 rounded-lg hover:bg-red-500/10')
            }
            title="Sign out"
          >
            <LogOut className={sidebarCollapsed ? 'w-[18px] h-[18px]' : 'w-[18px] h-[18px]'} />
            <span className={sidebarCollapsed ? 'text-[9px]' : 'text-sm'}>Sign out</span>
          </button>
        </div>
      </aside>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <HistoryModal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
      <WhatsNewModal isOpen={whatsNewOpen} onClose={() => setWhatsNewOpen(false)} />
      <ApprovalsModal isOpen={approvalsOpen} onClose={() => setApprovalsOpen(false)} />

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign Out"
        message="Are you sure you want to sign out? Your current session will end."
        confirmText="Sign Out"
        cancelText="Stay Signed In"
        variant="danger"
      />
    </>
  )
}

const NavItem = ({ icon: Icon, label, shortLabel, collapsed, onClick, badge, active }) => {
  const displayLabel = collapsed ? (shortLabel || label.split(' ')[0]) : label

  if (collapsed) {
    return (
      <button onClick={onClick}
        className="group w-full flex flex-col items-center gap-0.5 px-1 py-2 rounded-lg transition-colors hover:bg-dark-hover"
        title={label}
      >
        <Icon className={`w-[18px] h-[18px] ${active ? 'text-primary-400' : 'text-text-muted group-hover:text-text-secondary'}`} />
        <span className={`text-[9px] text-center leading-tight ${active ? 'text-primary-400 font-medium' : 'text-text-muted group-hover:text-text-secondary'}`}>
          {displayLabel}
        </span>
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[16px] h-[16px] px-0.5">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all relative text-sm ' +
        (active
          ? 'bg-primary-500/15 text-primary-400 font-medium'
          : 'text-text-secondary hover:bg-dark-hover hover:text-text-primary')
      }
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge > 0 && (
        <span className="bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[16px] h-[16px] px-0.5">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}

export default Sidebar
