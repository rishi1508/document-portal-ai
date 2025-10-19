import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// User database with username/password
const USERS = {
  // DevOps users
  'devops-user': {
    password: 'devops123',
    name: 'DevOps User',
    email: 'devops-user@wonderlendhubs.com',
    department: 'devops',
    isAdmin: false
  },
  'devops-admin': {
    password: 'devopsadmin123',
    name: 'DevOps Admin',
    email: 'devops-admin@wonderlendhubs.com',
    department: 'devops',
    isAdmin: true
  },
  
  // Platform Engineering users
  'platform-user': {
    password: 'platform123',
    name: 'Platform User',
    email: 'platform-user@wonderlendhubs.com',
    department: 'platform-engineering',
    isAdmin: false
  },
  'platform-admin': {
    password: 'platformadmin123',
    name: 'Platform Admin',
    email: 'platform-admin@wonderlendhubs.com',
    department: 'platform-engineering',
    isAdmin: true
  },
  
  // Solution Analysts users
  'analyst-user': {
    password: 'analyst123',
    name: 'Solution Analyst',
    email: 'analyst-user@wonderlendhubs.com',
    department: 'solution-analysts',
    isAdmin: false
  },
  'analyst-admin': {
    password: 'analystadmin123',
    name: 'Solution Analyst Admin',
    email: 'analyst-admin@wonderlendhubs.com',
    department: 'solution-analysts',
    isAdmin: true
  },
  
  // Product Management users
  'product-user': {
    password: 'product123',
    name: 'Product User',
    email: 'product-user@wonderlendhubs.com',
    department: 'product-management',
    isAdmin: false
  },
  'product-admin': {
    password: 'productadmin123',
    name: 'Product Admin',
    email: 'product-admin@wonderlendhubs.com',
    department: 'product-management',
    isAdmin: true
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load user from localStorage on mount
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const userRecord = USERS[username]
    
    // Check credentials
    if (!userRecord || userRecord.password !== password) {
      return false
    }

    // Create user session
    const userData = {
      username: username,
      name: userRecord.name,
      email: userRecord.email,
      department: userRecord.department,
      role: userRecord.isAdmin ? 'Admin' : 'User',
      isAdmin: userRecord.isAdmin
    }

    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
