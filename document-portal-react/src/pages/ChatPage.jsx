import React, { useEffect } from 'react'  // Removed refs/callbacks
import { useParams } from 'react-router-dom'  // Removed useNavigate
import { useChat } from '../contexts/ChatContext'
import { useSettings } from '../contexts/SettingsContext'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import ChatContainer from '../components/layout/ChatContainer'
import InputArea from '../components/layout/InputArea'

const ChatPage = () => {
  const { sidebarCollapsed } = useSettings()
  const { chatId: paramChatId } = useParams()
  const { loadChatById, isLoading } = useChat()  // Removed currentChatId, isSwitchingKB, navigate

  // Load from param once on mount (if exists)
  useEffect(() => {
    if (paramChatId) {
      loadChatById(paramChatId)  // Context updates URL if load succeeds
    }
  }, [paramChatId, loadChatById])

  // Show loading until context ready
  if (isLoading) {
    return (
      <div className="flex h-screen bg-dark-primary overflow-hidden">
        <Sidebar />
        <div className={'flex-1 flex flex-col transition-all duration-300 ' + (sidebarCollapsed ? 'ml-20' : 'ml-72')}>
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">Loading chat...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-dark-primary overflow-hidden">
      <Sidebar />
      <div className={'flex-1 flex flex-col transition-all duration-300 ' + (sidebarCollapsed ? 'ml-20' : 'ml-72')}>
        <Header />
        <div className="flex-1 flex flex-col min-h-0">
          <ChatContainer />
          <InputArea />
        </div>
      </div>
    </div>
  )
}

export default ChatPage
