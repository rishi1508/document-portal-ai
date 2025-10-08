import React, { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'

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
 const [sidebarCollapsed, setSidebarCollapsed] = useState(true) // Default to collapsed
 const [currentKB, setCurrentKBState] = useState('devops') // Default KB

 useEffect(() => {
 // Load settings from localStorage
 const savedSettings = localStorage.getItem('settings')
 if (savedSettings) {
 const parsed = JSON.parse(savedSettings)
 setSettings(parsed)
 applyTheme(parsed.theme)
 applyFontSize(parsed.fontSize)
 } else {
 // Apply default theme and font size
 applyTheme(settings.theme)
 applyFontSize(settings.fontSize)
 }

 const savedCollapsed = localStorage.getItem('sidebarCollapsed')
 if (savedCollapsed !== null) {
 setSidebarCollapsed(savedCollapsed === 'true')
 } else {
 setSidebarCollapsed(true) // Default collapsed
 localStorage.setItem('sidebarCollapsed', 'true')
 }


 // Load saved KB
 const savedKB = localStorage.getItem('currentKB')
 if (savedKB) {
 setCurrentKBState(savedKB)
 }
 }, [])

 const updateSettings = (newSettings) => {
 setSettings((prev) => {
 const updated = { ...prev, ...newSettings }
 localStorage.setItem('settings', JSON.stringify(updated))

 // Apply theme if changed
 if (newSettings.theme && newSettings.theme !== prev.theme) {
 applyTheme(newSettings.theme)
 }

 // Apply font size if changed
 if (newSettings.fontSize && newSettings.fontSize !== prev.fontSize) {
 applyFontSize(newSettings.fontSize)
 }

 return updated
 })
 }

 const setCurrentKB = (kbId) => {
 const prevKB = currentKB
 setCurrentKBState(kbId)
 localStorage.setItem('currentKB', kbId)

 // Show notification if KB changed
 if (prevKB !== kbId) {
 const kbName = kbId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
 toast.success(`Switched to ${kbName}`, {
 icon: '📚',
 duration: 2500,
 style: {
 minWidth: '280px',
 maxWidth: '280px',
 background: 'var(--bg-secondary)',
 color: 'var(--text-primary)',
 border: '1px solid var(--border-color)',
 }
 })
 }
 }



 const applyTheme = (theme) => {
 let actualTheme = theme

 if (theme === 'system') {
 actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
 ? 'dark'
 : 'light'
 }

 if (actualTheme === 'light') {
 document.documentElement.classList.remove('dark')
 document.documentElement.classList.add('light')
 // Update CSS variables for light mode
 document.documentElement.style.setProperty('--bg-primary', '#f9fafb')
 document.documentElement.style.setProperty('--bg-secondary', '#ffffff')
 document.documentElement.style.setProperty('--bg-tertiary', '#f3f4f6')
 document.documentElement.style.setProperty('--bg-hover', '#e5e7eb')
 document.documentElement.style.setProperty('--text-primary', '#1f2937')
 document.documentElement.style.setProperty('--text-secondary', '#6b7280')
 document.documentElement.style.setProperty('--text-muted', '#9ca3af')
 document.documentElement.style.setProperty('--border-color', '#e5e7eb')
 } else {
 document.documentElement.classList.remove('light')
 document.documentElement.classList.add('dark')
 // Restore dark mode CSS variables
 document.documentElement.style.setProperty('--bg-primary', '#0f1117')
 document.documentElement.style.setProperty('--bg-secondary', '#1a1d29')
 document.documentElement.style.setProperty('--bg-tertiary', '#23263a')
 document.documentElement.style.setProperty('--bg-hover', '#2d3148')
 document.documentElement.style.setProperty('--text-primary', '#ffffff')
 document.documentElement.style.setProperty('--text-secondary', '#9ca3af')
 document.documentElement.style.setProperty('--text-muted', '#6b7280')
 document.documentElement.style.setProperty('--border-color', '#2d3148')
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
 currentKB,
 setCurrentKB,
 }

 return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
