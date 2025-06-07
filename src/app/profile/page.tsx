'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function ProfilePage() {
  const { user, signOut, updateProfile } = useAuth()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    language: 'en',
    app_theme: 'dark',
    notifications_enabled: true,
  })

  // Initialize form data with user metadata
  useEffect(() => {
    if (user?.user_metadata) {
      setFormData({
        first_name: user.user_metadata.first_name || '',
        last_name: user.user_metadata.last_name || '',
        language: user.user_metadata.language || 'en',
        app_theme: user.user_metadata.app_theme || 'dark',
        notifications_enabled: user.user_metadata.notifications_enabled ?? true,
      })
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const { error } = await updateProfile(formData)
      if (error) {
        console.error('Error updating profile:', error)
        // You could add a toast notification here
      } else {
        setEditing(false)
        // You could add a success toast notification here
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-white">Loading...</div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="backdrop-blur-md bg-white/10 border-b border-white/20 p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-white text-xl font-bold">
            ← Back to Dashboard
          </Link>
          <button
            onClick={handleSignOut}
            className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-gray-400">Manage your account information and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-semibold text-lg">Profile Information</h3>
              <button
                onClick={() => setEditing(!editing)}
                className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
              >
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-black/20 text-gray-400 border border-white/20 rounded-lg px-4 py-3"
                />
                <p className="text-gray-500 text-xs mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">User ID</label>
                <input
                  type="text"
                  value={user?.id || ''}
                  disabled
                  className="w-full bg-black/20 text-gray-400 border border-white/20 rounded-lg px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">First Name</label>
                <input
                  type="text"
                  value={editing ? formData.first_name : (user?.user_metadata?.first_name || '')}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  disabled={!editing}
                  className="w-full bg-black/20 text-white border border-white/20 rounded-lg px-4 py-3 disabled:text-gray-400"
                  placeholder="Enter your first name"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">Last Name</label>
                <input
                  type="text"
                  value={editing ? formData.last_name : (user?.user_metadata?.last_name || '')}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  disabled={!editing}
                  className="w-full bg-black/20 text-white border border-white/20 rounded-lg px-4 py-3 disabled:text-gray-400"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            {editing && (
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setEditing(false)}
                  className="px-6 py-3 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {/* Preferences */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold text-lg mb-6">Preferences</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white">Email Notifications</h4>
                  <p className="text-gray-400 text-sm">Receive email updates about your account</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white">Dark Mode</h4>
                  <p className="text-gray-400 text-sm">Use dark theme throughout the app</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white">Data Analytics</h4>
                  <p className="text-gray-400 text-sm">Help improve the app with usage data</p>
                </div>
                <input type="checkbox" className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Module Access */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold text-lg mb-6">Module Access</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">💰</span>
                  <h4 className="text-white font-medium">Finance</h4>
                </div>
                <p className="text-gray-400 text-sm mb-3">Manage your finances and budgets</p>
                <span className="inline-block bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Active</span>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">💪</span>
                  <h4 className="text-white font-medium">Fitness</h4>
                </div>
                <p className="text-gray-400 text-sm mb-3">Track workouts and health</p>
                <span className="inline-block bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs">Coming Soon</span>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">📚</span>
                  <h4 className="text-white font-medium">Learning</h4>
                </div>
                <p className="text-gray-400 text-sm mb-3">Educational progress tracking</p>
                <span className="inline-block bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs">Coming Soon</span>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold text-lg mb-6">Account Actions</h3>
            
            <div className="space-y-4">
              <button className="w-full bg-blue-500/20 text-blue-300 py-3 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors text-left px-4">
                Export Account Data
              </button>
              
              <button className="w-full bg-yellow-500/20 text-yellow-300 py-3 rounded-lg border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors text-left px-4">
                Change Password
              </button>
              
              <button className="w-full bg-red-500/20 text-red-300 py-3 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors text-left px-4">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  )
}
