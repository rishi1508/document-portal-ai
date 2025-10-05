import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const ProtectedRoute = ({ children, requireAdmin }) => {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (requireAdmin && !user.isAdmin) return <Navigate to="/dashboard" replace />

  return children
}

export default ProtectedRoute
