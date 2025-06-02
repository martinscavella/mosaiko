export default function ReportsPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Financial Reports</h1>
          <p className="text-gray-400">Analyze your financial data with detailed reports</p>
        </div>

        {/* Report types */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Income vs Expenses</h3>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">Monthly comparison of your income and expenses</p>
            <button className="w-full bg-blue-500/20 text-blue-300 py-2 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Spending by Category</h3>
              <span className="text-2xl">🥧</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">See where your money goes each month</p>
            <button className="w-full bg-purple-500/20 text-purple-300 py-2 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Net Worth Trend</h3>
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">Track your financial growth over time</p>
            <button className="w-full bg-green-500/20 text-green-300 py-2 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Budget Analysis</h3>
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">Compare actual spending vs budgeted amounts</p>
            <button className="w-full bg-yellow-500/20 text-yellow-300 py-2 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Cash Flow</h3>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">Monitor money coming in and going out</p>
            <button className="w-full bg-indigo-500/20 text-indigo-300 py-2 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Custom Reports</h3>
              <span className="text-2xl">🔧</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">Create personalized financial reports</p>
            <button className="w-full bg-gray-500/20 text-gray-300 py-2 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-white font-semibold mb-4">Report Period</h3>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30">
              This Month
            </button>
            <button className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg border border-white/10 hover:bg-white/10">
              Last Month
            </button>
            <button className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg border border-white/10 hover:bg-white/10">
              Last 3 Months
            </button>
            <button className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg border border-white/10 hover:bg-white/10">
              This Year
            </button>
            <button className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg border border-white/10 hover:bg-white/10">
              Custom Range
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
