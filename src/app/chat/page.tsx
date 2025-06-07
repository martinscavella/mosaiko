'use client'

import ProtectedRoute from '@/components/ProtectedRoute'

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Chat</h1>
              <p className="text-gray-600">Connect with financial advisors and support</p>
            </div>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
              8 unread
            </span>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Chat Feature
              </h3>
              <p className="text-gray-500 mb-4">
                This feature will allow you to chat with financial advisors and get support.
              </p>
              <p className="text-sm text-gray-400">
                Coming soon in the next update!
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
