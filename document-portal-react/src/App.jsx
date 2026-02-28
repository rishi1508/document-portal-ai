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
import ErrorBoundary from './components/common/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <NotificationsProvider>
            <SettingsProvider>
              <ChatProvider>
                <div className="app">
                  <Routes>
                    <Route path="/login" element={<Login />} />

                    {/* Dashboard as default landing */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* Documents page */}
                    <Route
                      path="/documents"
                      element={
                        <ProtectedRoute>
                          <DocumentsPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* AI Chat routes */}
                    <Route
                      path="/chat"
                      element={
                        <ProtectedRoute>
                          <ChatPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/chat/:chatId"
                      element={
                        <ProtectedRoute>
                          <ChatPage />
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

                    {/* Default route - go to dashboard */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                  <Toaster
                    position="bottom-right"
                    toastOptions={{
                      duration: 3000,
                      style: {
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        fontSize: '13px',
                        boxShadow: '0 12px 40px rgb(0 0 0 / 20%)',
                      },
                    }}
                  />
                </div>
              </ChatProvider>
            </SettingsProvider>
          </NotificationsProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
