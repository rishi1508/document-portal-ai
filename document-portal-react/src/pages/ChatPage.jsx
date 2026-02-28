import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useChat } from '../contexts/ChatContext'
import { useSettings } from '../contexts/SettingsContext'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import ChatContainer from '../components/layout/ChatContainer'
import InputArea from '../components/layout/InputArea'

const ChatPage = () => {
  const { sidebarCollapsed } = useSettings()
  const { chatId: paramChatId } = useParams()
  const { loadChatById, isLoading } = useChat()

  useEffect(() => {
    if (paramChatId) {
      loadChatById(paramChatId)
    }
  }, [paramChatId, loadChatById])

  if (isLoading) {
    return (
      <div className="flex h-screen bg-dark-primary overflow-hidden">
        <Sidebar />
        <div className={'flex-1 flex flex-col transition-all duration-300 ' + (sidebarCollapsed ? 'ml-20' : 'ml-72')}>
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-text-muted">Loading chat...</p>
            </div>
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
