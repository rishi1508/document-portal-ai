import React, { createContext, useContext, useState, useEffect } from 'react'

const ChatContext = createContext()

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within ChatProvider')
  }
  return context
}

export const ChatProvider = ({ children }) => {
  const [currentKB, setCurrentKB] = useState('devops')
  const [currentChat, setCurrentChat] = useState({
    id: Date.now(),
    messages: [],
    timestamp: new Date().toISOString(),
    kbId: 'devops',
    title: null,
  })
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory')
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory))
    }
  }, [])

  const addMessage = (type, content, sources = []) => {
    const newMessage = {
      type,
      content,
      sources,
      timestamp: new Date().toISOString(),
    }

    setCurrentChat((prev) => {
      const now = Date.now()
      const recentDuplicate = prev.messages.find(msg => {
        const msgTime = new Date(msg.timestamp).getTime()
        const timeDiff = now - msgTime
        return (
          msg.type === type &&
          msg.content === content &&
          timeDiff < 3000
        )
      })

      if (recentDuplicate) {
        console.log('Prevented duplicate message')
        return prev
      }

      const updated = {
        ...prev,
        messages: [...prev.messages, newMessage],
      }

      if (!updated.title && type === 'user') {
        updated.title = content.substring(0, 60) + (content.length > 60 ? '...' : '')
      }

      saveChatToHistory(updated)

      return updated
    })
  }

  const saveChatToHistory = (chat) => {
    const hasUserMessage = chat.messages.some(msg => msg.type === 'user')

    if (hasUserMessage) {
      setChatHistory((prev) => {
        const filtered = prev.filter((c) => c.id !== chat.id)

        const firstUserMsg = chat.messages.find(msg => msg.type === 'user')
        const title = firstUserMsg?.content.substring(0, 60) + (firstUserMsg?.content.length > 60 ? '...' : '') || 'Untitled Chat'

        const lastMsg = chat.messages[chat.messages.length - 1]
        const preview = lastMsg?.content.substring(0, 100) + (lastMsg?.content.length > 100 ? '...' : '')

        const updated = [
          {
            id: chat.id,
            title: title,
            preview: preview,
            timestamp: chat.timestamp,
            messages: chat.messages,
            kbId: chat.kbId,
          },
          ...filtered,
        ].slice(0, 50)

        localStorage.setItem('chatHistory', JSON.stringify(updated))
        return updated
      })
    }
  }

  const deleteChat = (chatId) => {
    setChatHistory((prev) => {
      const updated = prev.filter((c) => c.id !== chatId)
      localStorage.setItem('chatHistory', JSON.stringify(updated))
      return updated
    })
  }

  const startNewChat = () => {
    const hasUserMessage = currentChat.messages.some(msg => msg.type === 'user')
    if (hasUserMessage) {
      saveChatToHistory(currentChat)
    }

    setCurrentChat({
      id: Date.now(),
      messages: [],
      timestamp: new Date().toISOString(),
      kbId: currentKB,
      title: null,
    })
  }

  const restoreChat = (chat) => {
    setCurrentChat({
      id: chat.id,
      messages: chat.messages,
      timestamp: chat.timestamp,
      kbId: chat.kbId,
      title: chat.title,
    })
    setCurrentKB(chat.kbId)
  }

  // NEW: Get conversation history for API
  const getConversationHistory = () => {
    return currentChat.messages.slice(-6).map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))
  }

  const value = {
    currentKB,
    setCurrentKB,
    currentChat,
    addMessage,
    chatHistory,
    restoreChat,
    startNewChat,
    deleteChat,
    getConversationHistory, // NEW
    isLoading,
    setIsLoading,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
