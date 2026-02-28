import React, { useEffect, useRef } from 'react'
import { useChat } from '../../contexts/ChatContext'
import Message from './Message'

const ChatMessages = () => {
  const { currentChat } = useChat()
  const messagesEndRef = useRef(null)

  const messages = currentChat?.messages || []

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className="max-w-4xl mx-auto space-y-5 py-2">
      {messages.map((message, index) => (
        <Message key={`${message.timestamp}-${index}`} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

export default ChatMessages
