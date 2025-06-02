export default function TransactionsPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>
            <p className="text-gray-400">Track your income and expenses</p>
          </div>
          <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
            Add Transaction
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 mb-6">
          <div className="flex flex-wrap gap-4">
            <select className="bg-black/20 text-white border border-white/20 rounded-lg px-3 py-2">
              <option>All Categories</option>
            </select>
            <select className="bg-black/20 text-white border border-white/20 rounded-lg px-3 py-2">
              <option>All Accounts</option>
            </select>
            <input 
              type="date" 
              className="bg-black/20 text-white border border-white/20 rounded-lg px-3 py-2"
            />
            <input 
              type="date" 
              className="bg-black/20 text-white border border-white/20 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* Placeholder content */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
          <div className="text-6xl mb-4">💳</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Transactions Yet</h3>
          <p className="text-gray-400 mb-6">Start tracking your income and expenses</p>
          <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors">
            Add Your First Transaction
          </button>
        </div>
      </div>
    </div>
  )
}
