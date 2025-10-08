import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Brain, Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

const Login = () => {
 const navigate = useNavigate()
 const { login } = useAuth()

 const [formData, setFormData] = useState({
 email: '',
 password: '',
 department: '',
 })

 const departments = [
 { id: 'devops', name: 'DevOps', icon: '🔧' },
 { id: 'platform', name: 'Platform Engineering', icon: '⚙️' },
 { id: 'security', name: 'Security', icon: '🔒' },
 { id: 'solution', name: 'Solution Analysts', icon: '💡' },
 { id: 'product', name: 'Product Managers', icon: '📊' },
 { id: 'general', name: 'General', icon: '📄' },
 ]

 const handleSubmit = (e) => {
 e.preventDefault()

 if (!formData.email || !formData.password || !formData.department) {
 toast.error('Please fill in all fields')
 return
 }

 const isAdmin = formData.email.toLowerCase() === 'admin@example.com'

 const mockUser = {
 name: formData.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
 email: formData.email,
 department: formData.department,
 role: isAdmin ? 'Admin' : 'User',
 isAdmin: isAdmin,
 }

 login(mockUser)
 toast.success('Welcome ' + mockUser.name + '!')
 navigate('/dashboard')
 }

 return (
 <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-primary flex items-center justify-center p-4">
 <div className="w-full max-w-2xl">
 <div className="text-center mb-8">
 <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-4">
 <Brain className="w-10 h-10 text-text-primary" />
 </div>
 <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent mb-2">
 DocuMind AI
 </h1>
 <p className="text-text-secondary">
 Sign in to access your document knowledge base
 </p>
 </div>

 <div className="bg-dark-secondary border border-dark-tertiary rounded-xl p-8 shadow-2xl">
 <form onSubmit={handleSubmit} className="space-y-6">
 <div>
 <label className="block text-sm font-semibold text-text-primary mb-2">
 Email Address
 </label>
 <div className="relative">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
 <input
 type="email"
 value={formData.email}
 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 placeholder="you@example.com"
 className="w-full pl-10 pr-4 py-3 bg-dark-tertiary border border-dark-hover rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-semibold text-text-primary mb-2">
 Password
 </label>
 <div className="relative">
 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
 <input
 type="password"
 value={formData.password}
 onChange={(e) => setFormData({ ...formData, password: e.target.value })}
 placeholder="Enter your password"
 className="w-full pl-10 pr-4 py-3 bg-dark-tertiary border border-dark-hover rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-semibold text-text-primary mb-2">
 Department
 </label>
 <div className="grid grid-cols-3 gap-3">
 {departments.map((dept) => (
 <button
 key={dept.id}
 type="button"
 onClick={() => setFormData({ ...formData, department: dept.id })}
 className={'p-4 bg-dark-tertiary border-2 rounded-lg transition-all hover:bg-dark-hover ' + (
 formData.department === dept.id
 ? 'border-primary-500 bg-primary-500/10'
 : 'border-dark-hover'
 )}
 >
 <div className="text-2xl mb-2">{dept.icon}</div>
 <div className="text-xs font-semibold text-text-primary">
 {dept.name}
 </div>
 </button>
 ))}
 </div>
 </div>

 <button
 type="submit"
 className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-text-primary font-semibold rounded-lg transition-all"
 >
 Sign In
 </button>
 </form>

 <div className="mt-6 text-center">
 <p className="text-xs text-text-muted">
 Use <strong className="text-primary-500">admin@example.com</strong> as email to login as admin
 </p>
 </div>
 </div>

 <div className="mt-6 text-center text-text-muted text-sm">
 <p>© 2025 DocuMind AI. Powered by AWS Bedrock.</p>
 </div>
 </div>
 </div>
 )
}

export default Login
