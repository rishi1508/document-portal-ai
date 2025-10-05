import React, { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { X, Settings as SettingsIcon, Monitor, Sun, Moon } from 'lucide-react'
import toast from 'react-hot-toast'

const SettingsModal = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useSettings()
  const [localSettings, setLocalSettings] = useState(settings)

  if (!isOpen) return null

  const handleSave = () => {
    updateSettings(localSettings)
    toast.success('Settings saved successfully!')
    onClose()
  }

  const themeOptions = [
    { value: 'dark', label: 'Dark Mode', icon: Moon },
    { value: 'light', label: 'Light Mode', icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-dark-secondary border border-dark-tertiary rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-slide-up shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-tertiary">
          <h2 className="text-xl font-semibold text-white flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-primary-500" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Theme Selection */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Appearance</h3>

            <div className="space-y-3">
              {themeOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => setLocalSettings({ ...localSettings, theme: option.value })}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      localSettings.theme === option.value
                        ? 'bg-primary-500/20 border-primary-500'
                        : 'bg-dark-tertiary border-dark-hover hover:border-dark-hover hover:bg-dark-hover'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        localSettings.theme === option.value
                          ? 'bg-primary-500'
                          : 'bg-dark-primary'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          localSettings.theme === option.value
                            ? 'text-white'
                            : 'text-text-secondary'
                        }`} />
                      </div>
                      <span className={`font-medium ${
                        localSettings.theme === option.value
                          ? 'text-primary-500'
                          : 'text-text-primary'
                      }`}>
                        {option.label}
                      </span>
                    </div>
                    {localSettings.theme === option.value && (
                      <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Text Size</h3>

            <div className="space-y-3">
              {['small', 'medium', 'large'].map((size) => (
                <button
                  key={size}
                  onClick={() => setLocalSettings({ ...localSettings, fontSize: size })}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    localSettings.fontSize === size
                      ? 'bg-primary-500/20 border-primary-500'
                      : 'bg-dark-tertiary border-dark-hover hover:border-dark-hover hover:bg-dark-hover'
                  }`}
                >
                  <span className={`font-medium capitalize ${
                    localSettings.fontSize === size
                      ? 'text-primary-500'
                      : 'text-text-primary'
                  }`}>
                    {size}
                  </span>
                  {localSettings.fontSize === size && (
                    <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications Toggle */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Preferences</h3>

            <label className="flex items-center justify-between p-4 bg-dark-tertiary border border-dark-hover rounded-lg cursor-pointer hover:bg-dark-hover transition-colors">
              <div>
                <span className="text-text-primary font-medium block mb-1">Enable Notifications</span>
                <span className="text-text-secondary text-sm">Receive updates and alerts</span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={localSettings.notifications}
                  onChange={(e) => setLocalSettings({ ...localSettings, notifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-primary rounded-full peer-checked:bg-primary-500 transition-colors"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-dark-tertiary">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-dark-tertiary border border-dark-hover text-text-primary rounded-lg hover:bg-dark-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
