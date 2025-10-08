import React, { useEffect, useRef } from 'react'
import { useChat } from '../../contexts/ChatContext'
import Message from './Message'

const ChatMessages = () => {
 const { currentChat } = useChat()
 const messagesEndRef = useRef(null)

 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
 }

 useEffect(() => {
 scrollToBottom()
 }, [currentChat.messages])

 return (
 <div className="max-w-4xl mx-auto space-y-6">
 {currentChat.messages.map((message, index) => (
 <Message key={index} message={message} />
 ))}
 <div ref={messagesEndRef} />
 </div>
 )
}

export default ChatMessages
