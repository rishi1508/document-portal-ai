import React, { createContext, useContext, useState, useEffect } from 'react'

const NotificationsContext = createContext()

export const useNotifications = () => {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider')
  }
  return context
}

const STORAGE_KEY = 'documind_notifications'

const loadNotifications = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load notifications:', error)
  }

  // Default notifications if none in storage
  return [
    {
      id: 1,
      type: 'doc_approved',
      title: 'Document Approved',
      body: 'Your document "AWS Lambda Best Practices" has been approved',
      time: '5m ago',
      read: false,
      meta: { docId: 1 }
    },
    {
      id: 2,
      type: 'system',
      title: 'System Update',
      body: 'New features have been added to the platform',
      time: '1h ago',
      read: false,
      meta: {}
    }
  ]
}

export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(loadNotifications)

  // Save to localStorage whenever notifications change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
    } catch (error) {
      console.error('Failed to save notifications:', error)
    }
  }, [notifications])

  const addNotification = (notification) => {
    const newNotification = {
      ...notification,
      id: Date.now(),
      time: 'Just now',
      read: false
    }
    setNotifications(prev => [newNotification, ...prev])
  }

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    )
  }

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}
