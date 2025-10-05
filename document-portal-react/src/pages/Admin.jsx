import React from 'react'
import { useAuth } from '../contexts/AuthContext'

const Admin = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-dark-primary p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-dark-secondary border border-dark-tertiary rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Pending Approvals</h3>
            <p className="text-4xl font-bold text-primary-500">3</p>
          </div>

          <div className="bg-dark-secondary border border-dark-tertiary rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Total Documents</h3>
            <p className="text-4xl font-bold text-secondary-500">24</p>
          </div>

          <div className="bg-dark-secondary border border-dark-tertiary rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Active Users</h3>
            <p className="text-4xl font-bold text-yellow-500">12</p>
          </div>
        </div>

        <div className="bg-dark-secondary border border-dark-tertiary rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Document Uploads</h2>
          <div className="space-y-4">
            <p className="text-text-secondary">Admin features coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin
