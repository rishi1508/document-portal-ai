import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { ChatProvider } from './contexts/ChatContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { NotificationsProvider } from './contexts/NotificationsContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DocumentsPage from './pages/DocumentsPage'
import ChatPage from './pages/ChatPage'
import Admin from './pages/Admin'
import ProtectedRoute from './components/common/ProtectedRoute'

function App() {
 return (
 <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
 <AuthProvider>
 <NotificationsProvider>
 <SettingsProvider>
 <ChatProvider>
 <div className="app">
 <Routes>
 <Route path="/login" element={<Login />} />

 {/* Documents as default landing page */}
 <Route
 path="/documents"
 element={
 <ProtectedRoute>
 <DocumentsPage />
 </ProtectedRoute>
 }
 />

 {/* AI Chat as secondary feature */}
 <Route
 path="/chat"
 element={
 <ProtectedRoute>
 <ChatPage />
 </ProtectedRoute>
 }
 />

 {/* Legacy dashboard route - redirect to documents */}
 <Route
 path="/dashboard"
 element={
 <ProtectedRoute>
 <DocumentsPage />
 </ProtectedRoute>
 }
 />

 <Route
 path="/admin"
 element={
 <ProtectedRoute requireAdmin>
 <Admin />
 </ProtectedRoute>
 }
 />

 {/* Default route - go to documents */}
 <Route path="/" element={<Navigate to="/documents" replace />} />
 </Routes>
 <Toaster
 position="bottom-right"
 toastOptions={{
 duration: 3000,
 style: {
 background: 'var(--bg-secondary)',
 color: 'var(--text-primary)',
 border: '1px solid var(--border-color)',
 },
 }}
 />
 </div>
 </ChatProvider>
 </SettingsProvider>
 </NotificationsProvider>
 </AuthProvider>
 </Router>
 )
}

export default App
