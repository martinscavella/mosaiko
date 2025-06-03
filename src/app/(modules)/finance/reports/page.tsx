export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Reports</h1>
          <p className="text-gray-600">Analyze your financial data with detailed reports</p>
        </div>

        {/* Report types */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Income vs Expenses</h3>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">Monthly comparison of your income and expenses</p>
            <button className="w-full bg-gray-100 text-gray-500 py-2 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Spending by Category</h3>
              <span className="text-2xl">🥧</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">See where your money goes each month</p>
            <button className="w-full bg-gray-100 text-gray-500 py-2 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Net Worth Trend</h3>
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">Track your financial growth over time</p>
            <button className="w-full bg-gray-100 text-gray-500 py-2 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Budget Analysis</h3>
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">Compare actual spending vs budgeted amounts</p>
            <button className="w-full bg-gray-100 text-gray-500 py-2 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Cash Flow</h3>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">Monitor money coming in and going out</p>
            <button className="w-full bg-gray-100 text-gray-500 py-2 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Custom Reports</h3>
              <span className="text-2xl">🔧</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">Create personalized financial reports</p>
            <button className="w-full bg-gray-100 text-gray-500 py-2 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Period</h3>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg border border-blue-500 hover:bg-blue-600">
              This Month
            </button>
            <button className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50">
              Last Month
            </button>
            <button className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50">
              Last 3 Months
            </button>
            <button className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50">
              This Year
            </button>
            <button className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50">
              Custom Range
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
