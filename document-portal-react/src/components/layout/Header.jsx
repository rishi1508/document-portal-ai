import React, { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationsContext'
import { useSettings } from '../../contexts/SettingsContext'
import { Bell, User, LogOut, Brain } from 'lucide-react'
import NotificationsPanel from './NotificationsPanel'

const Header = () => {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const { sidebarCollapsed } = useSettings()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const notificationButtonRef = useRef(null)
  const userMenuRef = useRef(null)

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout()
    }
  }

  return (
    <header 
      className={'fixed top-0 right-0 h-16 bg-dark-secondary/80 backdrop-blur-md border-b border-dark-tertiary z-40 transition-all duration-300 ' + (
        sidebarCollapsed ? 'left-20' : 'left-72'
      )}
    >
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left side - Brain icon + Title */}
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary-500" />
        </div>

        {/* Right side - Notifications + User */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              ref={notificationButtonRef}
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-dark-hover rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-text-secondary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <NotificationsPanel
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
              anchorRef={notificationButtonRef}
            />
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              ref={userMenuRef}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 hover:bg-dark-hover rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                <p className="text-xs text-text-secondary">{user?.email}</p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-dark-secondary border border-dark-tertiary rounded-lg shadow-xl overflow-hidden">
                <div className="p-3 border-b border-dark-tertiary">
                  <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                  <p className="text-xs text-text-secondary">{user?.email}</p>
                  <p className="text-xs text-text-muted mt-1 capitalize">{user?.department}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary hover:bg-dark-hover transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
