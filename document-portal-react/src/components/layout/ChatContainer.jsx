import React, { useEffect, useRef } from 'react'
import { useChat } from '../../contexts/ChatContext'
import WelcomeScreen from '../chat/WelcomeScreen'
import ChatMessages from '../chat/ChatMessages'

const ChatContainer = () => {
 const { currentChat, addMessage } = useChat()
 const hasMessages = currentChat.messages.length > 0
 const welcomeSentRef = useRef({})

 useEffect(() => {
 // Only send welcome if this chat ID hasn't received one yet
 const chatId = currentChat.id

 if (currentChat.messages.length === 0 && !welcomeSentRef.current[chatId]) {
 const welcomeMessages = [
 "Hello! I'm here to help you with information from our company's knowledge base. Feel free to ask anything.",
 "Hi there! I'm your AI assistant. I can help you find information from our documentation. What would you like to know?",
 "Welcome! I have access to our company's knowledge base and I'm here to assist you. How can I help today?",
 "Greetings! I'm ready to help you explore our documentation and answer your questions. What can I help you with?",
 "Hello! I'm your document assistant. Ask me anything about our company policies, procedures, or technical documentation.",
 ]

 const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]

 // Mark this chat as having received welcome
 welcomeSentRef.current[chatId] = true

 // Add welcome message after a short delay
 const timeoutId = setTimeout(() => {
 // Double check - only add if still no messages
 if (currentChat.messages.length === 0) {
 addMessage('assistant', randomWelcome, [])
 }
 }, 500)

 return () => clearTimeout(timeoutId)
 }
 }, [currentChat.id, currentChat.messages.length, addMessage])

 return (
 <div className="flex-1 overflow-y-auto pt-16">
 {hasMessages ? (
 <div className="max-w-5xl mx-auto px-6 py-8">
 <ChatMessages />
 </div>
 ) : (
 <div className="flex items-center justify-center min-h-full px-6">
 <div className="max-w-5xl w-full">
 <WelcomeScreen />
 </div>
 </div>
 )}
 </div>
 )
}

export default ChatContainer
