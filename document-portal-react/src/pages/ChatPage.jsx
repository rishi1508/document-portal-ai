import React from 'react'
import { useSettings } from '../contexts/SettingsContext'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import ChatContainer from '../components/layout/ChatContainer'
import InputArea from '../components/layout/InputArea'

const ChatPage = () => {
  const { sidebarCollapsed } = useSettings()

  return (
    <div className="flex h-screen bg-dark-primary overflow-hidden">
      <Sidebar />
      
      <div className={'flex-1 flex flex-col transition-all duration-300 ' + (sidebarCollapsed ? 'ml-20' : 'ml-72')}>
        <Header />
        <ChatContainer />
        <InputArea />
      </div>
    </div>
  )
}

export default ChatPage
