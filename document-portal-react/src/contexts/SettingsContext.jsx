import React, { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext()

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    theme: 'dark',
    fontSize: 'medium',
    notifications: true,
    language: 'en',
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  useEffect(() => {
    const savedSettings = localStorage.getItem('settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(parsed)
        applyTheme(parsed.theme)
        applyFontSize(parsed.fontSize)
      } catch {
        applyTheme(settings.theme)
        applyFontSize(settings.fontSize)
      }
    } else {
      applyTheme(settings.theme)
      applyFontSize(settings.fontSize)
    }

    const savedCollapsed = localStorage.getItem('sidebarCollapsed')
    if (savedCollapsed !== null) {
      setSidebarCollapsed(savedCollapsed === 'true')
    } else {
      setSidebarCollapsed(true)
      localStorage.setItem('sidebarCollapsed', 'true')
    }
  }, [])

  const updateSettings = (newSettings) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings }
      localStorage.setItem('settings', JSON.stringify(updated))

      if (newSettings.theme && newSettings.theme !== prev.theme) {
        applyTheme(newSettings.theme)
      }
      if (newSettings.fontSize && newSettings.fontSize !== prev.fontSize) {
        applyFontSize(newSettings.fontSize)
      }

      return updated
    })
  }

  const applyTheme = (theme) => {
    let actualTheme = theme
    if (theme === 'system') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    if (actualTheme === 'light') {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
      document.documentElement.style.setProperty('--bg-primary', '#f8fafc')
      document.documentElement.style.setProperty('--bg-secondary', '#ffffff')
      document.documentElement.style.setProperty('--bg-tertiary', '#f1f5f9')
      document.documentElement.style.setProperty('--bg-hover', '#e2e8f0')
      document.documentElement.style.setProperty('--bg-elevated', '#f8fafc')
      document.documentElement.style.setProperty('--text-primary', '#0f172a')
      document.documentElement.style.setProperty('--text-secondary', '#475569')
      document.documentElement.style.setProperty('--text-muted', '#94a3b8')
      document.documentElement.style.setProperty('--border-color', '#e2e8f0')
      document.documentElement.style.setProperty('--accent', '#4f46e5')
      document.documentElement.style.setProperty('--accent-hover', '#4338ca')
    } else {
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add('dark')
      document.documentElement.style.setProperty('--bg-primary', '#0a0c10')
      document.documentElement.style.setProperty('--bg-secondary', '#12141c')
      document.documentElement.style.setProperty('--bg-tertiary', '#1a1d2b')
      document.documentElement.style.setProperty('--bg-hover', '#252838')
      document.documentElement.style.setProperty('--bg-elevated', '#2a2d3e')
      document.documentElement.style.setProperty('--text-primary', '#f1f5f9')
      document.documentElement.style.setProperty('--text-secondary', '#94a3b8')
      document.documentElement.style.setProperty('--text-muted', '#64748b')
      document.documentElement.style.setProperty('--border-color', '#1e2235')
      document.documentElement.style.setProperty('--accent', '#6366f1')
      document.documentElement.style.setProperty('--accent-hover', '#4f46e5')
    }
  }

  const applyFontSize = (size) => {
    const root = document.documentElement
    switch (size) {
      case 'small':
        root.style.setProperty('font-size', '13px')
        break
      case 'large':
        root.style.setProperty('font-size', '16px')
        break
      case 'medium':
      default:
        root.style.setProperty('font-size', '14px')
        break
    }
  }

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev
      localStorage.setItem('sidebarCollapsed', newValue.toString())
      return newValue
    })
  }

  const value = {
    settings,
    updateSettings,
    sidebarCollapsed,
    toggleSidebar,
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
