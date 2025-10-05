import React, { useRef, useEffect } from 'react'
import { Check, Trash2, CheckCheck, X } from 'lucide-react'
import { useNotifications } from '../../contexts/NotificationsContext'
import toast from 'react-hot-toast'

const NotificationsPanel = ({ isOpen, onClose, anchorRef }) => {
  const panelRef = useRef(null)
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target)
      ) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, anchorRef])

  if (!isOpen) return null

  const handleMarkAsRead = (id, e) => {
    e.stopPropagation()
    markAsRead(id)
    toast.success('Marked as read')
  }

  const handleDelete = (id, e) => {
    e.stopPropagation()
    deleteNotification(id)
    toast.success('Notification deleted')
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
    toast.success('All notifications marked as read')
  }

  const handleClearAll = () => {
    if (window.confirm('Clear all notifications?')) {
      clearAll()
      toast.success('All notifications cleared')
      onClose()
    }
  }

  const getNotificationIcon = (type) => {
    const iconMap = {
      doc_approved: '✅',
      doc_submitted: '📝',
      doc_rejected: '❌',
      system: '🔔',
      update: '🆕'
    }
    return iconMap[type] || '🔔'
  }

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-96 bg-dark-secondary border border-dark-tertiary rounded-xl shadow-2xl z-50 animate-slide-down"
    >
      {/* Header */}
      <div className="p-4 border-b border-dark-tertiary">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white text-lg">Notifications</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-dark-hover rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
        <p className="text-sm text-text-secondary">
          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
        </p>
      </div>

      {/* Action buttons */}
      {notifications.length > 0 && (
        <div className="flex items-center gap-2 p-3 border-b border-dark-tertiary bg-dark-tertiary/30">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-primary-500/20 text-primary-500 rounded-lg hover:bg-primary-500/30 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear all
          </button>
        </div>
      )}

      {/* Notifications list */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-text-secondary text-sm">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-tertiary">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={'group relative px-4 py-3 hover:bg-dark-hover transition-all cursor-default ' + (
                  !notif.read ? 'bg-primary-500/5' : ''
                )}
              >
                {/* Unread dot */}
                {!notif.read && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary-500 rounded-full"></div>
                )}

                <div className="flex items-start gap-3 pl-3">
                  {/* Icon */}
                  <div className="text-xl flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-text-primary text-sm leading-tight">
                        {notif.title}
                      </h4>
                      <span className="text-xs text-text-muted whitespace-nowrap">
                        {notif.time}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {notif.body}
                    </p>
                  </div>

                  {/* Action buttons - show on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.read && (
                      <button
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="p-1 bg-primary-500/20 text-primary-500 rounded hover:bg-primary-500/30 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="p-1 bg-red-500/20 text-red-500 rounded hover:bg-red-500/30 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationsPanel
