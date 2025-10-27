import React, { useEffect, useRef } from 'react'
import { useChat } from '../../contexts/ChatContext'
import Message from './Message'

const ChatMessages = () => {
  const { currentChat } = useChat()
  const messagesEndRef = useRef(null)

  // Safe access: fallback to empty array
  const messages = currentChat?.messages || []

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])  // Depend on messages array for re-scroll on changes

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {messages.map((message, index) => (
        <Message key={`${message.timestamp}-${index}`} message={message} />  // Better key: timestamp + index
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

export default ChatMessages
