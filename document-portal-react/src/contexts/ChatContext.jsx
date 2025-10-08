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
 title: null, // Will be set from first user message
 })
 const [chatHistory, setChatHistory] = useState([])
 const [isLoading, setIsLoading] = useState(false)

 useEffect(() => {
 // Load chat history from localStorage
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
 // Prevent duplicate messages - check if identical message exists in last 3 seconds
 const now = Date.now()
 const recentDuplicate = prev.messages.find(msg => {
 const msgTime = new Date(msg.timestamp).getTime()
 const timeDiff = now - msgTime
 return (
 msg.type === type &&
 msg.content === content &&
 timeDiff < 3000 // Within 3 seconds
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

 // Set chat title from first USER message (not assistant message)
 if (!updated.title && type === 'user') {
 updated.title = content.substring(0, 60) + (content.length > 60 ? '...' : '')
 }

 // Update chat history
 saveChatToHistory(updated)

 return updated
 })
 }

 const saveChatToHistory = (chat) => {
 // Only save if chat has at least one user message
 const hasUserMessage = chat.messages.some(msg => msg.type === 'user')

 if (hasUserMessage) {
 setChatHistory((prev) => {
 const filtered = prev.filter((c) => c.id !== chat.id)

 // Find first user message for title
 const firstUserMsg = chat.messages.find(msg => msg.type === 'user')
 const title = firstUserMsg?.content.substring(0, 60) + (firstUserMsg?.content.length > 60 ? '...' : '') || 'Untitled Chat'

 // Find last message for preview
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
 ].slice(0, 50) // Keep only last 50 chats

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
 // Save current chat before starting new one
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

 const value = {
 currentKB,
 setCurrentKB,
 currentChat,
 addMessage,
 chatHistory,
 restoreChat,
 startNewChat,
 deleteChat,
 isLoading,
 setIsLoading,
 }

 return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
