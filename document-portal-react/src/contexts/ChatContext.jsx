import React, { createContext, useContext, useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from './AuthContext'

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
}

export const ChatProvider = ({ children }) => {
  const { user } = useAuth()
  const [currentKB, setCurrentKBInternal] = useState('common-policies')
  const [currentChatId, setCurrentChatId] = useState(null)
  const [chatsById, setChatsById] = useState({})
  const [kbChatMap, setKbChatMap] = useState({})
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitchingKB, setIsSwitchingKB] = useState(false)

  const getCurrentChat = () => {
    const chat = chatsById[currentChatId]
    if (!chat) {
      return {
        id: null,
        messages: [],
        timestamp: new Date().toISOString(),
        kbId: currentKB,
        title: null,
      }
    }
    return chat
  }

  const createNewChatForKB = (kbId) => {
    const newId = uuidv4()
    const newChat = {
      id: newId,
      messages: [],
      timestamp: new Date().toISOString(),
      kbId,
      title: null,
    }

    setChatsById(prev => ({ ...prev, [newId]: newChat }))
    setKbChatMap(prev => ({ ...prev, [kbId]: newId }))
    setCurrentChatId(newId)
    
    // Update URL directly (no React Router deps, no loops)
    if (window.location.pathname.startsWith('/chat')) {
      window.history.replaceState(null, '', `/chat/${newId}`)
    }
    
    return newId
  }

  const switchKB = (newKB) => {
    if (newKB === currentKB || isSwitchingKB) return

    setIsSwitchingKB(true)
    setCurrentKBInternal(newKB)

    const existingChatId = kbChatMap[newKB]
    if (existingChatId && chatsById[existingChatId]) {
      setCurrentChatId(existingChatId)
      // Update URL to existing chat
      if (window.location.pathname.startsWith('/chat')) {
        window.history.replaceState(null, '', `/chat/${existingChatId}`)
      }
    } else {
      const newId = createNewChatForKB(newKB)
      // URL updated in createNewChatForKB
    }

    setIsSwitchingKB(false)
  }

  const addMessage = (type, content, sources = []) => {
    let chatIdToUse = currentChatId
    if (!chatIdToUse) {
      chatIdToUse = createNewChatForKB(currentKB)
    }

    const newMessage = {
      type,
      content,
      sources,
      timestamp: new Date().toISOString(),
    }

    setChatsById(prev => {
      const chat = prev[chatIdToUse]
      if (!chat) return prev

      const now = Date.now()
      const recentDuplicate = chat.messages.find(msg => {
        const msgTime = new Date(msg.timestamp).getTime()
        const timeDiff = now - msgTime
        return msg.type === type && msg.content === content && timeDiff < 3000
      })

      if (recentDuplicate) {
        console.log('Prevented duplicate message')
        return prev
      }

      const updatedChat = {
        ...chat,
        messages: [...chat.messages, newMessage],
      }

      if (type === 'user' && !updatedChat.title) {
        generateChatTitle(updatedChat)
      }

      if (updatedChat.messages.some(m => m.type === 'user')) {
        saveChatToHistory(updatedChat)
      }

      return { ...prev, [chatIdToUse]: updatedChat }
    })

    if (currentChatId !== chatIdToUse) {
      setCurrentChatId(chatIdToUse)
    }
  }

  const generateChatTitle = async (chat) => {
    try {
      const userMessages = chat.messages.filter(m => m.type === 'user').slice(0, 3).map(m => m.content)
      if (userMessages.length === 0) return

      const response = await fetch('http://localhost:3200/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: userMessages })
      })

      const data = await response.json()
      const title = data.title || `${KB_NAMES[chat.kbId]} Chat`

      const updatedChat = { ...chat, title }
      setChatsById(prev => ({ ...prev, [chat.id]: updatedChat }))
      saveChatToHistory(updatedChat)
    } catch (err) {
      console.error('Title generation failed:', err)
    }
  }

  const saveChatToHistory = (chat) => {
    if (!user?.id || !chat.messages.some(m => m.type === 'user')) return

    setChatHistory(prev => {
      const filtered = prev.filter(c => c.id !== chat.id)

      const title = chat.title || `${KB_NAMES[chat.kbId]} Chat`
      const lastMsg = chat.messages[chat.messages.length - 1]
      const preview = lastMsg?.content.substring(0, 100) + (lastMsg?.content.length > 100 ? '...' : '')

      const chatForHistory = { ...chat, title, preview }

      const updated = [chatForHistory, ...filtered].slice(0, 50)
      return updated
    })
  }

  const deleteChat = (chatId) => {
    if (!user?.id) return

    setChatHistory(prev => {
      const updated = prev.filter(c => c.id !== chatId)
      return updated
    })

    setChatsById(prev => {
      const { [chatId]: _, ...rest } = prev
      return rest
    })

    setKbChatMap(prev => {
      const kbToRemove = Object.entries(prev).find(([_, id]) => id === chatId)?.[0]
      if (kbToRemove) {
        const { [kbToRemove]: __, ...rest } = prev
        return rest
      }
      return prev
    })

    if (currentChatId === chatId) {
      const newId = createNewChatForKB(currentKB)
      setCurrentChatId(newId)
    }
  }

  const loadChatById = (chatId) => {
    if (isSwitchingKB) return false
    if (chatsById[chatId]) {
      setCurrentChatId(chatId)
      const chat = chatsById[chatId]
      setCurrentKBInternal(chat.kbId)
      // Update URL
      if (window.location.pathname.startsWith('/chat')) {
        window.history.replaceState(null, '', `/chat/${chatId}`)
      }
      return true
    }
    return false
  }

  const startNewChat = () => {
    const chat = getCurrentChat()
    if (chat?.messages.some(msg => msg.type === 'user')) {
      saveChatToHistory(chat)
    }
    const newId = createNewChatForKB(currentKB)
    setCurrentChatId(newId)
    // URL updated in createNewChatForKB
  }

  const getConversationHistory = () => {
    const chat = getCurrentChat()
    return chat.messages.slice(-6).map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))
  }

  // Load/Save useEffects unchanged
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    const historyKey = `chatHistory_${user.id}`
    const savedHistory = localStorage.getItem(historyKey)
    const loginTrigger = localStorage.getItem('loginTrigger')
    setIsLoading(true)

    if (savedHistory) {
      const history = JSON.parse(savedHistory)
      setChatHistory(history)

      const loadedChats = {}
      const loadedMap = {}
      history.forEach(chat => {
        loadedChats[chat.id] = chat
        if (!loadedMap[chat.kbId]) {
          loadedMap[chat.kbId] = chat.id
        }
      })
      setChatsById(loadedChats)
      setKbChatMap(loadedMap)

      const initialChatId = loadedMap['common-policies'] || createNewChatForKB('common-policies')
      setCurrentChatId(initialChatId)
      setCurrentKBInternal('common-policies')
    } else {
      const initialId = createNewChatForKB('common-policies')
      setCurrentChatId(initialId)
      setCurrentKBInternal('common-policies')
    }

    if (loginTrigger) {
      setCurrentKBInternal('common-policies')
      const newId = createNewChatForKB('common-policies')
      setCurrentChatId(newId)
      localStorage.removeItem('loginTrigger')
    }

    setIsLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    const historyKey = `chatHistory_${user.id}`
    const chatsKey = `chatsById_${user.id}`
    localStorage.setItem(chatsKey, JSON.stringify(chatsById))
    localStorage.setItem(historyKey, JSON.stringify(chatHistory))
  }, [chatsById, chatHistory, user?.id])

  const setCurrentKB = switchKB

  const value = {
    currentKB,
    setCurrentKB,
    switchKB,
    currentChatId,
    currentChat: getCurrentChat(),
    addMessage,
    chatHistory,
    loadChatById,
    startNewChat,
    deleteChat,
    getConversationHistory,
    isLoading,
    setIsLoading,
    isSwitchingKB,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
