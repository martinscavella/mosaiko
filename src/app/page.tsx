'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useFinancialSummary } from '@/lib/hooks/useFinancialSummary'
import { SampleDataCreator } from '@/components/ui/SampleDataCreator'
import Link from 'next/link'
import {
  ChartBarIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  PresentationChartLineIcon,
  ArrowRightIcon,
  PlusIcon,
  EyeIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline'

const features = [
  {
    name: 'Track Expenses',
    description: 'Monitor your spending across all categories and accounts',
    icon: CreditCardIcon,
    color: 'blue'
  },
  {
    name: 'Budget Management',
    description: 'Set budgets and track your progress towards financial goals',
    icon: CurrencyDollarIcon,
    color: 'green'
  },
  {
    name: 'Financial Reports',
    description: 'Get insights with detailed charts and analytics',
    icon: PresentationChartLineIcon,
    color: 'purple'
  },
  {
    name: 'Account Overview',
    description: 'Keep all your financial accounts organized in one place',
    icon: ChartBarIcon,
    color: 'indigo'
  }
]

const quickActions = [
  { name: 'Add Transaction', icon: PlusIcon, href: '/finance/transactions?new=true' },
  { name: 'View Accounts', icon: EyeIcon, href: '/finance/accounts' },
  { name: 'Reports', icon: DocumentChartBarIcon, href: '/finance/reports' }
]

export default function HomePage() {
  const { user, loading } = useAuth()
  const { summary, loading: summaryLoading } = useFinancialSummary()
  const [showSampleDataCreator, setShowSampleDataCreator] = useState(false)
  
  const hasData = summary.accountsCount > 0 || summary.transactionsCount > 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
              <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                <div className="sm:text-center lg:text-left">
                  <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                    <span className="block xl:inline">Take control of your</span>{' '}
                    <span className="block text-blue-600 xl:inline">financial future</span>
                  </h1>
                  <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                    Mosaiko helps you track expenses, manage budgets, and achieve your financial goals with beautiful insights and easy-to-use tools.
                  </p>
                  <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                    <div className="rounded-md shadow">
                      <Link
                        href="/auth/register"
                        className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                      >
                        Get started for free
                      </Link>
                    </div>
                    <div className="mt-3 sm:mt-0 sm:ml-3">
                      <Link
                        href="/auth/login"
                        className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 md:py-4 md:text-lg md:px-10"
                      >
                        Sign in
                      </Link>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
          <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
            <div className="h-56 w-full bg-gradient-to-br from-blue-500 to-purple-600 sm:h-72 md:h-96 lg:w-full lg:h-full flex items-center justify-center">
              <div className="text-center text-white p-8">
                <ChartBarIcon className="h-24 w-24 mx-auto mb-4 opacity-90" />
                <h3 className="text-2xl font-bold mb-2">Smart Analytics</h3>
                <p className="text-blue-100">Visualize your financial data with beautiful charts and insights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Everything you need to manage your finances
              </p>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
                Our comprehensive suite of tools helps you stay on top of your financial health.
              </p>
            </div>

            <div className="mt-10">
              <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                {features.map((feature) => (
                  <div key={feature.name} className="relative">
                    <dt>
                      <div className={`absolute flex items-center justify-center h-12 w-12 rounded-md bg-${feature.color}-500 text-white`}>
                        <feature.icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{feature.name}</p>
                    </dt>
                    <dd className="mt-2 ml-16 text-base text-gray-500">{feature.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600">
          <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              <span className="block">Ready to take control?</span>
              <span className="block">Start your financial journey today.</span>
            </h2>
            <p className="mt-4 text-lg leading-6 text-blue-200">
              Join thousands of users who have already improved their financial health with Mosaiko.
            </p>
            <Link
              href="/auth/register"
              className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 sm:w-auto"
            >
              Sign up for free
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // User is logged in - show dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Here's your financial overview for today
          </p>
          {!summaryLoading && !hasData && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Get Started</h3>
                  <p className="text-sm text-blue-600">
                    No financial data found. Create sample data to explore the app or add your first account.
                  </p>
                </div>
                <button
                  onClick={() => setShowSampleDataCreator(true)}
                  className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  Add Sample Data
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 group"
              >
                <div className="flex items-center">
                  <action.icon className="h-8 w-8 text-blue-600 group-hover:text-blue-700" />
                  <span className="ml-3 text-sm font-medium text-gray-900 group-hover:text-blue-700">
                    {action.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryLoading ? '...' : `€${summary.totalBalance.toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <CreditCardIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Monthly Expenses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryLoading ? '...' : `€${summary.monthlyExpenses.toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Accounts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryLoading ? '...' : summary.accountsCount}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <PresentationChartLineIcon className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Savings Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryLoading ? '...' : `${summary.savingsRate.toFixed(1)}%`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation to Finance Modules */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Finance Management</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/finance/dashboard"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <ChartBarIcon className="h-8 w-8 text-blue-600 mb-3 group-hover:text-blue-700" />
              <h3 className="font-medium text-gray-900 group-hover:text-blue-700">Dashboard</h3>
              <p className="text-sm text-gray-500 mt-1">Overview and analytics</p>
            </Link>
            
            <Link
              href="/finance/accounts"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <CreditCardIcon className="h-8 w-8 text-green-600 mb-3 group-hover:text-green-700" />
              <h3 className="font-medium text-gray-900 group-hover:text-green-700">Accounts</h3>
              <p className="text-sm text-gray-500 mt-1">Manage your accounts</p>
            </Link>
            
            <Link
              href="/finance/transactions"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <CurrencyDollarIcon className="h-8 w-8 text-purple-600 mb-3 group-hover:text-purple-700" />
              <h3 className="font-medium text-gray-900 group-hover:text-purple-700">Transactions</h3>
              <p className="text-sm text-gray-500 mt-1">Track your expenses</p>
            </Link>
            
            <Link
              href="/finance/reports"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <PresentationChartLineIcon className="h-8 w-8 text-indigo-600 mb-3 group-hover:text-indigo-700" />
              <h3 className="font-medium text-gray-900 group-hover:text-indigo-700">Reports</h3>
              <p className="text-sm text-gray-500 mt-1">Financial insights</p>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Sample Data Creator Modal */}
      {showSampleDataCreator && (
        <SampleDataCreator onClose={() => setShowSampleDataCreator(false)} />
      )}
    </div>
  )
}
