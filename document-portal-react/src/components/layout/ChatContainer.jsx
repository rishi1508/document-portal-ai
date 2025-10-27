import React, { useEffect, useRef } from 'react'
import { useChat } from '../../contexts/ChatContext'
import WelcomeScreen from '../chat/WelcomeScreen'
import ChatMessages from '../chat/ChatMessages'

const ChatContainer = () => {
  const { currentChat, addMessage, currentChatId, isLoading } = useChat()
  const chat = currentChat || { messages: [], id: null }
  const hasMessages = chat.messages.length > 0
  const welcomeSentRef = useRef({})

  // Show loading if context loading
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 h-full w-full overflow-y-auto pt-24 pb-40 px-4 items-center justify-center">
        <div className="text-center">Initializing chat...</div>
      </div>
    )
  }

  useEffect(() => {
    const chatKey = currentChatId || 'temp'
    if (hasMessages || welcomeSentRef.current[chatKey]) return  // Skip if messages exist or sent

    const welcomeMessages = [
      "Hello! I'm here to help you with information from our company's knowledge base. Feel free to ask anything.",
      "Hi there! I'm your AI assistant. I can help you find information from our documentation. What would you like to know?",
      "Welcome! I have access to our company's knowledge base and I'm here to assist you. How can I help today?",
      "Greetings! I'm ready to help you explore our documentation and answer your questions. What can I help you with?",
      "Hello! I'm your document assistant. Ask me anything about our company policies, procedures, or technical documentation.",
    ]

    const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]
    welcomeSentRef.current[chatKey] = true

    const timeoutId = setTimeout(() => {
      if (!hasMessages) {
        addMessage('assistant', randomWelcome, [])
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [currentChatId, hasMessages, addMessage])

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full w-full overflow-y-auto pt-24 pb-40 px-4">
      {hasMessages ? (
        <div className="max-w-5xl mx-auto w-full">
          <ChatMessages />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center min-h-0">
          <div className="max-w-5xl w-full">
            <WelcomeScreen />
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatContainer
