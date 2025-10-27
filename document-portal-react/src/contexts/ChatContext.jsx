import React, { createContext, useContext, useState, useEffect } from 'react'

const ChatContext = createContext()

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within ChatProvider')
  }
  return context
}

const KB_NAMES = {
  'common-policies': 'Common Policies',
  'devops': 'DevOps',
  'platform-engineering': 'Platform Engineering',
  'product-management': 'Product Management',
  'solution-analysts': 'Solution Analysts',
};

export const ChatProvider = ({ children }) => {
  const [currentKB, setCurrentKB] = useState('common-policies')
  
  // Store separate chats per KB
  const [chatsByKB, setChatsByKB] = useState({
    'common-policies': {
      id: Date.now(),
      messages: [],
      timestamp: new Date().toISOString(),
      kbId: 'common-policies',
      title: null,
    }
  })
  
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // Load chat history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory')
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory))
    }
    
    // Load saved chats per KB
    const savedChats = localStorage.getItem('chatsByKB')
    if (savedChats) {
      setChatsByKB(JSON.parse(savedChats))
    }
  }, [])

  // Save chats per KB to localStorage
  useEffect(() => {
    localStorage.setItem('chatsByKB', JSON.stringify(chatsByKB))
  }, [chatsByKB])

  // Get current chat for active KB
  const currentChat = chatsByKB[currentKB] || {
    id: Date.now(),
    messages: [],
    timestamp: new Date().toISOString(),
    kbId: currentKB,
    title: null,
  }

  // Switch KB - create new chat if doesn't exist
  const switchKB = (newKB) => {
    if (newKB === currentKB) return
    
    setCurrentKB(newKB)
    
    // If no chat exists for this KB, create one
    if (!chatsByKB[newKB]) {
      setChatsByKB(prev => ({
        ...prev,
        [newKB]: {
          id: Date.now(),
          messages: [],
          timestamp: new Date().toISOString(),
          kbId: newKB,
          title: null,
        }
      }))
    }
  }

  const addMessage = (type, content, sources = []) => {
    const newMessage = {
      type,
      content,
      sources,
      timestamp: new Date().toISOString(),
    }

    setChatsByKB((prev) => {
      const chat = prev[currentKB] || currentChat
      
      // Prevent duplicates
      const now = Date.now()
      const recentDuplicate = chat.messages.find(msg => {
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

      const updatedChat = {
        ...chat,
        messages: [...chat.messages, newMessage],
      }

      // Generate AI title after first user message
      if (type === 'user' && !updatedChat.title) {
        generateChatTitle(updatedChat)
      }

      // Save to history only if user has sent a message
      if (updatedChat.messages.some(m => m.type === 'user')) {
        saveChatToHistory(updatedChat)
      }

      return {
        ...prev,
        [currentKB]: updatedChat
      }
    })
  }

  // Generate smart title using AI
  const generateChatTitle = async (chat) => {
    try {
      const userMessages = chat.messages
        .filter(m => m.type === 'user')
        .slice(0, 3)
        .map(m => m.content)
      
      if (userMessages.length === 0) return
      
      const response = await fetch('http://localhost:3200/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: userMessages })
      })
      
      const data = await response.json()
      const title = data.title || `${KB_NAMES[chat.kbId]} Chat`
      
      setChatsByKB(prev => ({
        ...prev,
        [chat.kbId]: {
          ...prev[chat.kbId],
          title
        }
      }))
      
      // Update in history too
      setChatHistory(prev => {
        const updated = prev.map(c => 
          c.id === chat.id ? { ...c, title } : c
        )
        localStorage.setItem('chatHistory', JSON.stringify(updated))
        return updated
      })
    } catch (err) {
      console.error('Title generation failed:', err)
    }
  }

  const saveChatToHistory = (chat) => {
    const hasUserMessage = chat.messages.some(msg => msg.type === 'user')

    if (hasUserMessage) {
      setChatHistory((prev) => {
        const filtered = prev.filter((c) => c.id !== chat.id)

        const title = chat.title || `${KB_NAMES[chat.kbId]} Chat`
        const lastMsg = chat.messages[chat.messages.length - 1]
        const preview = lastMsg?.content.substring(0, 100) + (lastMsg?.content.length > 100 ? '...' : '')

        const updated = [
          {
            id: chat.id,
            title,
            preview,
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
    const chat = chatsByKB[currentKB]
    const hasUserMessage = chat?.messages.some(msg => msg.type === 'user')
    
    if (hasUserMessage) {
      saveChatToHistory(chat)
    }

    const newChat = {
      id: Date.now(),
      messages: [],
      timestamp: new Date().toISOString(),
      kbId: currentKB,
      title: null,
    }

    setChatsByKB(prev => ({
      ...prev,
      [currentKB]: newChat
    }))
  }

  const restoreChat = (chat) => {
    setChatsByKB(prev => ({
      ...prev,
      [chat.kbId]: {
        id: chat.id,
        messages: chat.messages,
        timestamp: chat.timestamp,
        kbId: chat.kbId,
        title: chat.title,
      }
    }))
    setCurrentKB(chat.kbId)
  }

  const getConversationHistory = () => {
    const chat = chatsByKB[currentKB] || currentChat
    return chat.messages.slice(-6).map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))
  }

  const value = {
    currentKB,
    setCurrentKB: switchKB,
    currentChat,
    addMessage,
    chatHistory,
    restoreChat,
    startNewChat,
    deleteChat,
    getConversationHistory,
    isLoading,
    setIsLoading,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
