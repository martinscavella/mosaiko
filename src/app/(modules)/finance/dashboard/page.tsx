export default function FinanceDashboard() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Finance Dashboard</h1>
          <p className="text-gray-400">Overview of your financial status</p>
        </div>

        {/* Placeholder content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Total Balance</h3>
            <p className="text-3xl font-bold text-green-400">€0.00</p>
            <p className="text-gray-400 text-sm mt-2">Coming Soon</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Monthly Income</h3>
            <p className="text-3xl font-bold text-blue-400">€0.00</p>
            <p className="text-gray-400 text-sm mt-2">Coming Soon</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Monthly Expenses</h3>
            <p className="text-3xl font-bold text-red-400">€0.00</p>
            <p className="text-gray-400 text-sm mt-2">Coming Soon</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Savings Rate</h3>
            <p className="text-3xl font-bold text-purple-400">0%</p>
            <p className="text-gray-400 text-sm mt-2">Coming Soon</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
            <div className="text-center py-8">
              <span className="text-gray-400">No transactions yet</span>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Financial Goals</h3>
            <div className="text-center py-8">
              <span className="text-gray-400">No goals set yet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
