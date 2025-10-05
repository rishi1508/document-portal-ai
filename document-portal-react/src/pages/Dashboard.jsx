import React from 'react'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import ChatContainer from '../components/layout/ChatContainer'
import InputArea from '../components/layout/InputArea'

const Dashboard = () => {
  return (
    <div className="flex h-screen bg-dark-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <ChatContainer />
        <InputArea />
      </div>
    </div>
  )
}

export default Dashboard
