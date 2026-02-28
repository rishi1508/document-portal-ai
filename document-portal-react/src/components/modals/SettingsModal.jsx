import React, { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { X, Settings as SettingsIcon, Monitor, Sun, Moon, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const SettingsModal = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useSettings()
  const [localSettings, setLocalSettings] = useState(settings)

  if (!isOpen) return null

  const handleSave = () => {
    updateSettings(localSettings)
    toast.success('Settings saved')
    onClose()
  }

  const themeOptions = [
    { value: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
    { value: 'light', label: 'Light', icon: Sun, desc: 'Classic bright theme' },
    { value: 'system', label: 'System', icon: Monitor, desc: 'Match OS preference' },
  ]

  const fontSizes = [
    { value: 'small', label: 'Small', size: '13px' },
    { value: 'medium', label: 'Medium', size: '14px' },
    { value: 'large', label: 'Large', size: '16px' },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-dark-secondary border border-dark-tertiary rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col elevation-3 animate-slide-up">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-tertiary">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-primary-400" />
            Settings
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-dark-hover rounded-lg transition-colors">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
          {/* Theme */}
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Appearance</h3>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon
                const isSelected = localSettings.theme === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setLocalSettings({ ...localSettings, theme: option.value })}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'bg-primary-500/10 border-primary-500/50'
                        : 'bg-dark-tertiary border-dark-hover hover:border-dark-hover'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-primary-500/20' : 'bg-dark-hover'
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-primary-400' : 'text-text-muted'}`} />
                    </div>
                    <span className={`text-xs font-medium ${isSelected ? 'text-primary-400' : 'text-text-secondary'}`}>
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Text Size</h3>
            <div className="space-y-1.5">
              {fontSizes.map((size) => {
                const isSelected = localSettings.fontSize === size.value
                return (
                  <button
                    key={size.value}
                    onClick={() => setLocalSettings({ ...localSettings, fontSize: size.value })}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-primary-500/10 border-primary-500/30'
                        : 'bg-dark-tertiary border-dark-hover hover:bg-dark-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isSelected ? 'text-primary-400' : 'text-text-primary'}`}>
                        {size.label}
                      </span>
                      <span className="text-[10px] text-text-muted">{size.size}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary-400" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notifications */}
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Preferences</h3>
            <label className="flex items-center justify-between px-3 py-3 bg-dark-tertiary border border-dark-hover rounded-lg cursor-pointer hover:bg-dark-hover transition-colors">
              <div>
                <span className="text-sm text-text-primary font-medium block">Notifications</span>
                <span className="text-[10px] text-text-muted">Receive updates and alerts</span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={localSettings.notifications}
                  onChange={(e) => setLocalSettings({ ...localSettings, notifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-dark-primary rounded-full peer-checked:bg-primary-500 transition-colors" />
                <div className="absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-dark-tertiary">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-dark-tertiary border border-dark-hover text-text-primary rounded-lg hover:bg-dark-hover text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
