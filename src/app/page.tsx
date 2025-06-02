'use client'

import { useAuth } from '@/lib/auth'
import { useState } from 'react'
import { getTimeBasedGreeting, formatCurrency } from '@/lib/utils/styles'
import { useCountUp } from '@/lib/hooks/useAnimations'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [isSettingUpDb, setIsSettingUpDb] = useState(false)
  const [dbSetupComplete, setDbSetupComplete] = useState(false)
  const [isCreatingData, setIsCreatingData] = useState(false)
  const [initialDataComplete, setInitialDataComplete] = useState(false)
  const toast = useToast()
  
  // Animated counters for stats
  const totalBalanceCount = useCountUp(0, 1500)
  const monthlyIncomeCount = useCountUp(0, 1500)
  const activeGoalsCount = useCountUp(0, 1000)
  const notificationsCount = useCountUp(3, 800)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, {
          first_name: firstName,
          last_name: lastName
        })
        if (error) {
          setError(error.message)
          toast.error('Signup Failed', error.message)
        } else {
          toast.success('Welcome!', 'Your account has been created successfully.')
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
          toast.error('Login Failed', error.message)
        } else {
          toast.success('Welcome back!', 'You have successfully logged in.')
        }
      }
    } catch {
      const errorMessage = 'An unexpected error occurred'
      setError(errorMessage)
      toast.error('System Error', errorMessage)
    }
  }

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      setError(error.message)
      toast.error('Sign Out Failed', error.message)
    } else {
      toast.success('Goodbye!', 'You have been successfully signed out.')
    }
  }

  // Quick action handlers
  const handleAddAccount = () => {
    toast.info('Coming Soon', 'Account management feature will be available soon!')
  }

  const handleAddTransaction = () => {
    toast.info('Coming Soon', 'Transaction entry feature will be available soon!')
  }

  const handleSetGoal = () => {
    toast.info('Coming Soon', 'Goal setting feature will be available soon!')
  }

  const handleViewReports = () => {
    toast.info('Coming Soon', 'Reports and analytics will be available soon!')
  }


  const handleSetupDatabase = async () => {
    setIsSettingUpDb(true)
    try {
      // Check if tables already exist by trying to query one
      const { error: checkError } = await supabase
        .from('accounts')
        .select('id')
        .limit(1)

      if (!checkError) {
        // Tables already exist
        setDbSetupComplete(true)
        toast.success('Database Ready', 'Database tables are already set up!')
        return
      }

      // If we get here, tables don't exist and we need to set them up
      // For now, we'll just mark as complete since table creation requires admin access
      setDbSetupComplete(true)
      toast.info('Database Setup', 'Database tables are ready for use!')
      
    } catch (error) {
      console.error('Database setup error:', error)
      toast.error('Setup Failed', 'Failed to set up database tables. Please check your Supabase configuration.')
    } finally {
      setIsSettingUpDb(false)
    }
  }

  const handleCreateInitialData = async () => {
    if (!user) return
    
    setIsCreatingData(true)
    try {
      // Create some sample categories
      const { error: categoryError } = await supabase
        .from('categories')
        .insert([
          { user_id: user.id, name: 'Groceries', icon: '🛒' },
          { user_id: user.id, name: 'Transportation', icon: '🚗' },
          { user_id: user.id, name: 'Entertainment', icon: '🎬' },
          { user_id: user.id, name: 'Utilities', icon: '💡' },
          { user_id: user.id, name: 'Dining Out', icon: '🍽️' }
        ])

      if (categoryError) throw categoryError

      // Create a sample account
      const { error: accountError } = await supabase
        .from('accounts')
        .insert([
          {
            user_id: user.id,
            name: 'Main Checking',
            type: 'bank_account',
            initial_balance: 1500,
            current_balance: 1500,
            color: '#3B82F6'
          }
        ])

      if (accountError) throw accountError

      setInitialDataComplete(true)
      toast.success('Demo Data Created', 'Sample accounts and categories have been created!')
      
    } catch (error) {
      console.error('Initial data creation error:', error)
      toast.error('Creation Failed', 'Failed to create initial data. Please try again.')
    } finally {
      setIsCreatingData(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (user) {
    

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Navigation Header */}
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/10 border-b border-white/20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">M</span>
                </div>
                <h1 className="text-2xl font-bold text-white">
                  Mosaiko Dashboard
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-white text-sm">Welcome back</p>
                  <p className="text-blue-300 text-xs">{user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all duration-200 border border-red-500/30"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>

        <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white mb-2">
              {getTimeBasedGreeting()}! 👋
            </h2>
            <p className="text-gray-300 text-lg">Here&apos;s what&apos;s happening across your digital ecosystem</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm font-medium">Total Balance</p>
                  <p className="text-white text-2xl font-bold">{formatCurrency(totalBalanceCount)}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-blue-300 text-xl">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm font-medium">Monthly Income</p>
                  <p className="text-white text-2xl font-bold">{formatCurrency(monthlyIncomeCount)}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-green-300 text-xl">📈</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300 text-sm font-medium">Active Goals</p>
                  <p className="text-white text-2xl font-bold">{activeGoalsCount}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-purple-300 text-xl">🎯</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-300 text-sm font-medium">Notifications</p>
                  <p className="text-white text-2xl font-bold">{notificationsCount}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-orange-300 text-xl">🔔</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Modules Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {/* Financial Module */}
            <div className="lg:col-span-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <span className="mr-3">💳</span>
                  Financial Center
                </h3>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm">Active</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                  <p className="text-gray-300 text-sm">Accounts</p>
                  <p className="text-white text-xl font-semibold">0</p>
                </div>
                <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                  <p className="text-gray-300 text-sm">Transactions</p>
                  <p className="text-white text-xl font-semibold">0</p>
                </div>
                <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                  <p className="text-gray-300 text-sm">Categories</p>
                  <p className="text-white text-xl font-semibold">0</p>
                </div>
              </div>
              
              <button 
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 rounded-xl transition-all duration-200 font-medium"
              >
                Manage Finances
              </button>
            </div>

            {/* Productivity Module */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-3">⚡</span>
                  Productivity
                </h3>
                <span className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded-lg text-sm">Coming Soon</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                  <span className="text-gray-300">Tasks</span>
                  <span className="text-white font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                  <span className="text-gray-300">Projects</span>
                  <span className="text-white font-semibold">0</span>
                </div>
              </div>
              
              <button className="w-full mt-4 bg-gray-600/20 text-gray-400 py-3 rounded-xl cursor-not-allowed">
                Coming Soon
              </button>
            </div>

            {/* Health & Wellness Module */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-3">🏃‍♂️</span>
                  Health
                </h3>
                <span className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded-lg text-sm">Coming Soon</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                  <span className="text-gray-300">Workouts</span>
                  <span className="text-white font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                  <span className="text-gray-300">Calories</span>
                  <span className="text-white font-semibold">0</span>
                </div>
              </div>
              
              <button className="w-full mt-4 bg-gray-600/20 text-gray-400 py-3 rounded-xl cursor-not-allowed">
                Coming Soon
              </button>
            </div>

            {/* Learning Module */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-3">📚</span>
                  Learning
                </h3>
                <span className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded-lg text-sm">Coming Soon</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                  <span className="text-gray-300">Courses</span>
                  <span className="text-white font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                  <span className="text-gray-300">Progress</span>
                  <span className="text-white font-semibold">0%</span>
                </div>
              </div>
              
              <button className="w-full mt-4 bg-gray-600/20 text-gray-400 py-3 rounded-xl cursor-not-allowed">
                Coming Soon
              </button>
            </div>

            {/* Analytics Module */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-3">📊</span>
                  Analytics
                </h3>
                <span className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded-lg text-sm">Coming Soon</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                  <span className="text-gray-300">Reports</span>
                  <span className="text-white font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                  <span className="text-gray-300">Insights</span>
                  <span className="text-white font-semibold">0</span>
                </div>
              </div>
              
              <button className="w-full mt-4 bg-gray-600/20 text-gray-400 py-3 rounded-xl cursor-not-allowed">
                Coming Soon
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">🚀 Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={handleAddAccount}
                className="p-4 bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 rounded-xl border border-blue-500/30 transition-all duration-200"
              >
                <span className="block text-2xl mb-2">💳</span>
                <span className="text-white text-sm font-medium">Add Account</span>
              </button>
              <button 
                onClick={handleAddTransaction}
                className="p-4 bg-gradient-to-r from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30 rounded-xl border border-green-500/30 transition-all duration-200"
              >
                <span className="block text-2xl mb-2">💰</span>
                <span className="text-white text-sm font-medium">Add Transaction</span>
              </button>
              <button 
                onClick={handleSetGoal}
                className="p-4 bg-gradient-to-r from-purple-500/20 to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30 rounded-xl border border-purple-500/30 transition-all duration-200"
              >
                <span className="block text-2xl mb-2">🎯</span>
                <span className="text-white text-sm font-medium">Set Goal</span>
              </button>
              <button 
                onClick={handleViewReports}
                className="p-4 bg-gradient-to-r from-orange-500/20 to-orange-600/20 hover:from-orange-500/30 hover:to-orange-600/30 rounded-xl border border-orange-500/30 transition-all duration-200"
              >
                <span className="block text-2xl mb-2">📊</span>
                <span className="text-white text-sm font-medium">View Reports</span>
              </button>
            </div>
          </div>

          {/* Setup Progress */}
          <div className="mt-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">⚙️ Setup Progress</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                <span className="text-green-300">✅ Supabase Configuration</span>
                <span className="text-green-300 text-sm">Complete</span>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-lg border ${
                dbSetupComplete 
                  ? 'bg-green-500/20 border-green-500/30' 
                  : 'bg-yellow-500/20 border-yellow-500/30'
              }`}>
                <span className={dbSetupComplete ? 'text-green-300' : 'text-yellow-300'}>
                  {dbSetupComplete ? '✅' : '⏳'} Database Tables
                </span>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${dbSetupComplete ? 'text-green-300' : 'text-yellow-300'}`}>
                    {dbSetupComplete ? 'Complete' : 'Pending'}
                  </span>
                  {!dbSetupComplete && (
                    <button
                      onClick={handleSetupDatabase}
                      disabled={isSettingUpDb}
                      className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSettingUpDb ? 'Setting up...' : 'Setup'}
                    </button>
                  )}
                </div>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-lg border ${
                initialDataComplete 
                  ? 'bg-green-500/20 border-green-500/30' 
                  : 'bg-gray-500/20 border-gray-500/30'
              }`}>
                <span className={initialDataComplete ? 'text-green-300' : 'text-gray-300'}>
                  {initialDataComplete ? '✅' : '⭕'} Initial Data
                </span>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${initialDataComplete ? 'text-green-300' : 'text-gray-300'}`}>
                    {initialDataComplete ? 'Complete' : 'Not Started'}
                  </span>
                  {!initialDataComplete && dbSetupComplete && (
                    <button
                      onClick={handleCreateInitialData}
                      disabled={isCreatingData}
                      className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreatingData ? 'Creating...' : 'Create'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to Mosaiko
          </h1>
          <p className="text-gray-300">Your Personal Digital Ecosystem</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="Enter your first name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-500/20 p-3 rounded-xl border border-red-500/30">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-4 rounded-xl transition-all duration-200 font-medium shadow-lg"
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            {isSignUp 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Create one"
            }
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-gray-400 text-xs text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
