'use client'

import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { getTimeBasedGreeting } from '@/lib/utils/styles'
import {
  ChartBarIcon,
  HeartIcon,
  AcademicCapIcon,
  UserIcon,
  ArrowRightIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  FireIcon,
  StarIcon
} from '@heroicons/react/24/outline'

const modules = [
  {
    name: 'Finance',
    description: 'Manage your accounts, transactions, and financial goals',
    href: '/finance/dashboard',
    icon: ChartBarIcon,
    color: 'blue',
    stats: { accounts: 0, transactions: 0, balance: '$0' },
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    name: 'Fitness',
    description: 'Track workouts, nutrition, and health progress',
    href: '/fitness/workouts',
    icon: HeartIcon,
    color: 'red',
    stats: { workouts: 0, calories: 0, streak: '0 days' },
    gradient: 'from-red-500 to-pink-600'
  },
  {
    name: 'Learning',
    description: 'Explore courses, track progress, and earn achievements',
    href: '/learning/courses',
    icon: AcademicCapIcon,
    color: 'green',
    stats: { courses: 0, progress: '0%', achievements: 0 },
    gradient: 'from-green-500 to-emerald-600'
  }
]

const quickActions = [
  { name: 'Add Transaction', icon: PlusIcon, href: '/finance/transactions?new=true' },
  { name: 'Log Workout', icon: FireIcon, href: '/fitness/workouts?new=true' },
  { name: 'Start Course', icon: StarIcon, href: '/learning/courses?new=true' },
  { name: 'View Reports', icon: ArrowTrendingUpIcon, href: '/finance/reports' }
]

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32">
              <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                <div className="text-center lg:text-left">
                  <div className="lg:flex lg:items-center lg:justify-between">
                    <div className="lg:w-1/2">
                      <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
                        <span className="block">Organize your</span>
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                          entire life
                        </span>
                        <span className="block">in one place</span>
                      </h1>
                      <p className="mt-3 text-base text-gray-300 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                        Mosaiko is your personal command center for managing finances, tracking fitness goals, and advancing your learning journey. Everything synced, everything organized.
                      </p>
                      <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                        <div className="rounded-md shadow">
                          <Link
                            href="/auth/register"
                            className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 md:py-4 md:text-lg md:px-10 transition-all duration-200"
                          >
                            Get Started Free
                          </Link>
                        </div>
                        <div className="mt-3 sm:mt-0 sm:ml-3">
                          <Link
                            href="/auth/login"
                            className="w-full flex items-center justify-center px-8 py-3 border border-white/30 text-base font-medium rounded-md text-white bg-white/10 hover:bg-white/20 backdrop-blur-md md:py-4 md:text-lg md:px-10 transition-all duration-200"
                          >
                            Sign In
                          </Link>
                        </div>
                      </div>
                    </div>
                    
                    {/* Feature Preview */}
                    <div className="mt-12 lg:mt-0 lg:w-1/2 lg:pl-8">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                          <ChartBarIcon className="h-8 w-8 text-blue-400 mb-3" />
                          <h3 className="text-lg font-semibold text-white mb-2">Finance</h3>
                          <p className="text-gray-300 text-sm">Track expenses, manage budgets, and achieve financial goals</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                          <HeartIcon className="h-8 w-8 text-red-400 mb-3" />
                          <h3 className="text-lg font-semibold text-white mb-2">Fitness</h3>
                          <p className="text-gray-300 text-sm">Log workouts, monitor progress, and stay healthy</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                          <AcademicCapIcon className="h-8 w-8 text-green-400 mb-3" />
                          <h3 className="text-lg font-semibold text-white mb-2">Learning</h3>
                          <p className="text-gray-300 text-sm">Take courses, track progress, and expand knowledge</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                          <UserIcon className="h-8 w-8 text-purple-400 mb-3" />
                          <h3 className="text-lg font-semibold text-white mb-2">Profile</h3>
                          <p className="text-gray-300 text-sm">Customize settings and track overall progress</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-12 bg-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-blue-400 font-semibold tracking-wide uppercase">Features</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-white sm:text-4xl">
                Everything you need to succeed
              </p>
              <p className="mt-4 max-w-2xl text-xl text-gray-300 lg:mx-auto">
                Comprehensive tools designed to help you manage every aspect of your personal development.
              </p>
            </div>

            <div className="mt-10">
              <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <ChartBarIcon className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">Smart Financial Tracking</p>
                  <p className="mt-2 ml-16 text-base text-gray-300">
                    Automatically categorize transactions, set budgets, and visualize your financial health with intuitive charts and reports.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-r from-red-500 to-pink-600 text-white">
                    <HeartIcon className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">Fitness Progress Monitoring</p>
                  <p className="mt-2 ml-16 text-base text-gray-300">
                    Log workouts, track nutrition, and monitor your fitness journey with detailed analytics and progress visualization.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                    <AcademicCapIcon className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">Learning Path Management</p>
                  <p className="mt-2 ml-16 text-base text-gray-300">
                    Organize courses, track learning progress, and earn achievements as you develop new skills and knowledge.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                    <UserIcon className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">Unified Dashboard</p>
                  <p className="mt-2 ml-16 text-base text-gray-300">
                    See everything at a glance with a personalized dashboard that shows your progress across all areas of life.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              <span className="block">Ready to organize your life?</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Start your journey today.
              </span>
            </h2>
            <p className="mt-4 text-lg leading-6 text-gray-300">
              Join thousands of users who have transformed their lives with Mosaiko.
            </p>
            <div className="mt-8">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 md:py-4 md:text-lg md:px-10 transition-all duration-200"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {getTimeBasedGreeting()}! 👋
          </h1>
          <p className="text-xl text-gray-300">
            Welcome back, {user.email?.split('@')[0]}. Here&apos;s what&apos;s happening across your modules.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Total Balance</p>
                <p className="text-2xl font-bold text-white">$0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <HeartIcon className="h-8 w-8 text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Workouts</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AcademicCapIcon className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Courses</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-8 w-8 text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Profile</p>
                <p className="text-2xl font-bold text-white">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Modules */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Your Modules</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <Link
                key={module.name}
                href={module.href}
                className="group bg-white/10 backdrop-blur-md rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-200 overflow-hidden"
              >
                <div className={`h-2 bg-gradient-to-r ${module.gradient}`}></div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <module.icon className={`h-8 w-8 text-${module.color}-400`} />
                      <h3 className="ml-3 text-xl font-bold text-white">{module.name}</h3>
                    </div>
                    <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-200 transition-colors" />
                  </div>
                  
                  <p className="text-gray-300 mb-4">{module.description}</p>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {Object.entries(module.stats).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm text-gray-400 capitalize">{key}</p>
                        <p className="text-lg font-semibold text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-200 p-6 text-center group"
              >
                <action.icon className="h-8 w-8 text-gray-300 group-hover:text-white mx-auto mb-3 transition-colors" />
                <p className="text-sm font-medium text-white">{action.name}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <UserIcon className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-300">No recent activity</p>
            <p className="text-sm text-gray-400 mt-2">
              Start by exploring one of your modules above
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
