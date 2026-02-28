import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationsContext'
import { useSettings } from '../../contexts/SettingsContext'
import { Bell, User, LogOut, Brain, ChevronDown } from 'lucide-react'
import NotificationsPanel from './NotificationsPanel'
import ConfirmModal from '../modals/ConfirmModal'

const Header = () => {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const { sidebarCollapsed } = useSettings()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const notificationButtonRef = useRef(null)
  const userMenuRef = useRef(null)

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserMenu])

  const handleLogout = () => {
    setShowUserMenu(false)
    logout()
  }

  return (
    <>
      <header
        className={
          'fixed top-0 right-0 h-14 glass border-b border-dark-tertiary z-40 transition-all duration-300 ' +
          (sidebarCollapsed ? 'left-20' : 'left-72')
        }
      >
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {sidebarCollapsed && (
              <span className="text-base font-bold gradient-text">
                DocuMind
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                ref={notificationButtonRef}
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-dark-hover rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-[18px] h-[18px] text-text-secondary" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-primary-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-[var(--bg-secondary)]">
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

            {/* Divider */}
            <div className="w-px h-6 bg-dark-tertiary mx-1" />

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 p-1.5 hover:bg-dark-hover rounded-lg transition-colors"
              >
                <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-medium text-text-primary leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-text-muted leading-tight capitalize">{user?.department?.replace(/-/g, ' ')}</p>
                </div>
                <ChevronDown className="w-3 h-3 text-text-muted hidden md:block" />
              </button>

              {showUserMenu && (
                <div className="absolute top-full right-0 mt-1.5 w-52 bg-dark-secondary border border-dark-tertiary rounded-xl shadow-2xl overflow-hidden animate-slide-down">
                  <div className="p-3 border-b border-dark-tertiary">
                    <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                    <p className="text-xs text-text-muted">{user?.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="inline-flex px-1.5 py-0.5 bg-primary-500/15 text-primary-400 text-[10px] font-medium rounded">
                        {user?.role}
                      </span>
                      <span className="inline-flex px-1.5 py-0.5 bg-dark-tertiary text-text-muted text-[10px] font-medium rounded capitalize">
                        {user?.department?.replace(/-/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        setShowLogoutConfirm(true)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

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

export default Header
