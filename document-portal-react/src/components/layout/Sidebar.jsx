import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { KNOWLEDGE_BASES, ROLE_PERMISSIONS } from '../../config/knowledgeBases'
import {
 Brain, ChevronRight, FolderOpen, MessageSquare, History,
 Upload, Settings, LogOut, Shield, Server, Lightbulb, Bell, CheckCircle2
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
}

const Sidebar = () => {
 const navigate = useNavigate()
 const location = useLocation()
 const { user, logout } = useAuth()
 const { sidebarCollapsed, toggleSidebar, currentKB, setCurrentKB } = useSettings()

 const [settingsOpen, setSettingsOpen] = useState(false)
 const [uploadOpen, setUploadOpen] = useState(false)
 const [historyOpen, setHistoryOpen] = useState(false)
 const [whatsNewOpen, setWhatsNewOpen] = useState(false)
 const [approvalsOpen, setApprovalsOpen] = useState(false)
 const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

 const permissions = ROLE_PERMISSIONS[user?.department] || ROLE_PERMISSIONS.devops
 const allowedKBs = permissions.knowledgeBases

 const isActive = (path) => location.pathname === path

 // Expand by clicking on empty background of the aside
 const handleSidebarClick = (e) => {
 if (!sidebarCollapsed) return
 // If the click is on the aside itself (not on any child interactive element), expand
 const isInteractive = e.target.closest && e.target.closest('button, a, input, select, textarea, [role="button"]')
 if (!isInteractive) toggleSidebar()
 }

 const handleLogout = () => logout()

 return (
 <>
 <aside
 onClick={handleSidebarClick}
 className={
 'fixed left-0 top-0 h-screen border-r border-dark-tertiary flex flex-col transition-all duration-300 z-50 ' +
 (sidebarCollapsed ? 'w-20 bg-dark-secondary hover:bg-dark-secondary/80 cursor-pointer'
 : 'w-72 bg-dark-secondary/80')
 }
 >
 {/* Header - Always visible */}
 <div className="p-6 border-b border-dark-tertiary flex items-center justify-between flex-shrink-0">
 {sidebarCollapsed ? (
 <button
 onClick={(e) => {
 e.stopPropagation()
 toggleSidebar()
 }}
 className="w-full flex justify-center p-2 hover:bg-dark-hover rounded-lg transition-all"
 title="Expand Sidebar"
 >
 <ChevronRight className="w-5 h-5 text-text-secondary" />
 </button>
 ) : (
 <>
 <div className="flex items-center gap-3 overflow-hidden">
 <Brain className="w-6 h-6 text-primary-500 flex-shrink-0" />
 <span className="text-xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent whitespace-nowrap">
 DocuMind
 </span>
 </div>
 <button
 onClick={(e) => {
 e.stopPropagation()
 toggleSidebar()
 }}
 className="p-2 hover:bg-dark-hover rounded-lg transition-all"
 title="Collapse Sidebar"
 >
 <ChevronRight className="w-5 h-5 text-text-secondary transform rotate-180" />
 </button>
 </>
 )}
 </div>

 <nav
 className="flex-1 p-4 overflow-y-auto scrollbar-hide"
 style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
 >
 {/* Main Navigation */}
 <div className="mb-6">
 {!sidebarCollapsed && (
 <h3 className="text-xs font-semibold text-text-muted uppercase mb-3 px-3">
 Main
 </h3>
 )}
 <div className="space-y-1">
 <NavItem
 icon={FolderOpen}
 label="Documents"
 collapsed={sidebarCollapsed}
 active={isActive('/documents') || isActive('/') || isActive('/dashboard')}
 onClick={(e) => {
 e.stopPropagation()
 navigate('/documents')
 }}
 />
 <NavItem
 icon={MessageSquare}
 label="AI Chat"
 shortLabel="AI"
 collapsed={sidebarCollapsed}
 active={isActive('/chat')}
 onClick={(e) => {
 e.stopPropagation()
 navigate('/chat')
 }}
 />
 <NavItem
 icon={History}
 label="History"
 collapsed={sidebarCollapsed}
 onClick={(e) => {
 e.stopPropagation()
 setHistoryOpen(true)
 }}
 />
 <NavItem
 icon={Upload}
 label="Upload"
 collapsed={sidebarCollapsed}
 onClick={(e) => {
 e.stopPropagation()
 setUploadOpen(true)
 }}
 />
 </div>
 </div>

 {/* Separator: between Common (above) and Approvals (admin) when collapsed */}
 {user?.isAdmin && sidebarCollapsed && <div className="h-px bg-dark-tertiary my-3 mx-4" />}

 {/* Admin Approvals */}
 {user?.isAdmin && (
 <div className="mb-6">
 {!sidebarCollapsed && (
 <h3 className="text-xs font-semibold text-text-muted uppercase mb-3 px-3">
 Admin
 </h3>
 )}
 <NavItem
 icon={CheckCircle2}
 label="Approvals"
 collapsed={sidebarCollapsed}
 onClick={(e) => {
 e.stopPropagation()
 setApprovalsOpen(true)
 }}
 />
 </div>
 )}

 {/* Separator before Knowledge Base */}
 {sidebarCollapsed && <div className="h-px bg-dark-tertiary my-3 mx-4" />}

 {/* Knowledge Base Selector */}
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
 const isKBActive = currentKB === kbId

 return (
 <button
 key={kbId}
 onClick={(e) => {
 e.stopPropagation()
 setCurrentKB(kbId)
 }}
 className={'w-full transition-colors ' + (sidebarCollapsed ? 'group flex flex-col items-center gap-1 px-2 py-3 filter hover:brightness-95 active:brightness-90' : 'flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dark-hover') + (isKBActive && !sidebarCollapsed ? ' bg-primary-500/20' : '')}
 title={kb.name}
 >
 <Icon className={(isKBActive ? 'text-primary-500' : 'text-text-secondary') + ' ' + (sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5') + ' group-hover:text-text-primary'} />
 <span className={(sidebarCollapsed ? 'text-[10px] text-center leading-tight ' + (isKBActive ? 'text-primary-500 font-medium' : 'text-text-secondary') : 'flex-1 text-left text-sm ' + (isKBActive ? 'text-primary-500 font-medium' : 'text-text-secondary')) + ' group-hover:text-text-primary'}>
 {sidebarCollapsed ? kb.name.split(' ')[0] : kb.name}
 </span>
 </button>
 )
 })}
 </div>
 </div>

 {/* Separator before Quick Links when collapsed */}
 {sidebarCollapsed && <div className="h-px bg-dark-tertiary my-3 mx-4" />}

 {/* Quick Links */}
 <div>
 {!sidebarCollapsed && (
 <h3 className="text-xs font-semibold text-text-muted uppercase mb-3 px-3">
 Quick Links
 </h3>
 )}
 <div className="space-y-1">
 <NavItem
 icon={Bell}
 label="What's New"
 shortLabel="News"
 collapsed={sidebarCollapsed}
 onClick={(e) => {
 e.stopPropagation()
 setWhatsNewOpen(true)
 }}
 />
 </div>
 </div>
 </nav>

 <div className="p-4 border-t border-dark-tertiary space-y-1 flex-shrink-0">
 <NavItem
 icon={Settings}
 label="Settings"
 collapsed={sidebarCollapsed}
 onClick={(e) => {
 e.stopPropagation()
 setSettingsOpen(true)
 }}
 />
 <button
 onClick={(e) => {
 e.stopPropagation()
 setShowLogoutConfirm(true)
 }}
 className={'w-full flex items-center text-text-secondary hover:text-red-400 transition-colors group ' + (sidebarCollapsed ? 'flex-col gap-1 px-2 py-3 filter hover:brightness-95 active:brightness-90' : 'gap-3 px-3 py-2.5 rounded-lg hover:bg-dark-hover')}
 title="Logout"
 >
 <LogOut className={sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} />
 <span className={sidebarCollapsed ? 'text-[10px]' : 'text-sm'}>Logout</span>
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
 title="Confirm Logout"
 message="Are you sure you want to log out? Your current session will end."
 confirmText="Logout"
 cancelText="Stay Logged In"
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
 className="group w-full flex flex-col items-center gap-1 px-2 py-3 transition-colors filter hover:brightness-95 active:brightness-90"
 >
 <Icon className={(active ? 'w-6 h-6 text-primary-500' : 'w-5 h-5 text-text-secondary') + ' group-hover:text-text-primary'} />
 <span className={(active ? 'text-[10px] text-primary-500 font-medium' : 'text-[10px] text-text-secondary') + ' group-hover:text-text-primary'}>
 {displayLabel}
 </span>
 {badge > 0 && (
 <span className="absolute -top-1 -right-1 bg-primary-500 text-text-primary text-xs font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px] px-1">
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
 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative ' +
 (active ? 'bg-primary-500/20 text-primary-500' : 'text-text-secondary hover:bg-dark-hover hover:text-text-primary')
 }
 >
 <Icon className="w-5 h-5 flex-shrink-0" />
 <span className="text-sm flex-1 text-left">{label}</span>
 {badge > 0 && (
 <span className="bg-primary-500 text-text-primary text-xs font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px] px-1">
 {badge > 99 ? '99+' : badge}
 </span>
 )}
 </button>
 )
}

export default Sidebar
