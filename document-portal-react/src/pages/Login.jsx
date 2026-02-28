import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Brain, User, Lock, AlertCircle, ArrowRight, Sparkles, Shield, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const success = await login(username, password)

      if (success) {
        toast.success('Welcome back!')
        navigate('/dashboard')
      } else {
        setError('Invalid username or password')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-primary flex">
      {/* Left - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold gradient-text">DocuMind AI</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-1.5">
              Welcome back
            </h1>
            <p className="text-sm text-text-secondary">
              Sign in to access your document knowledge base
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="devops-user"
                  className="w-full pl-9 pr-4 py-2.5 bg-dark-tertiary border border-dark-hover rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-4 py-2.5 bg-dark-tertiary border border-dark-hover rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-3 bg-dark-tertiary border border-dark-hover rounded-lg">
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Demo accounts</p>
            <div className="grid grid-cols-2 gap-1.5">
              {['devops-user', 'platform-user', 'analyst-user', 'product-user'].map(u => (
                <button
                  key={u}
                  onClick={() => { setUsername(u); setPassword(u.split('-')[0] + '123') }}
                  className="text-xs text-text-secondary hover:text-primary-400 transition-colors text-left px-1.5 py-1 rounded hover:bg-dark-hover"
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right - Feature Showcase (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-gradient-to-br from-primary-600/10 via-dark-secondary to-dark-primary border-l border-dark-tertiary">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-text-primary mb-3">
            AI-Powered Document Intelligence
          </h2>
          <p className="text-sm text-text-secondary mb-8">
            Ask questions in natural language and get instant answers from your organization's knowledge base.
          </p>
          <div className="space-y-4">
            <FeatureItem
              icon={Sparkles}
              title="RAG Architecture"
              description="Vector embeddings + LLM for accurate document search"
              color="text-primary-400"
            />
            <FeatureItem
              icon={Zap}
              title="Serverless Backend"
              description="AWS Lambda, S3, DynamoDB - zero maintenance"
              color="text-amber-400"
            />
            <FeatureItem
              icon={Shield}
              title="Department RBAC"
              description="Secure role-based access per knowledge base"
              color="text-secondary-400"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const FeatureItem = ({ icon: Icon, title, description, color }) => (
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-lg bg-dark-tertiary flex items-center justify-center flex-shrink-0">
      <Icon className={`w-[18px] h-[18px] ${color}`} />
    </div>
    <div>
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="text-xs text-text-muted">{description}</p>
    </div>
  </div>
)

export default Login
