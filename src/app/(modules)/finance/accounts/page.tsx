export default function AccountsPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Accounts</h1>
            <p className="text-gray-400">Manage your bank accounts and cards</p>
          </div>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
            Add Account
          </button>
        </div>

        {/* Placeholder content */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
          <div className="text-6xl mb-4">🏦</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Accounts Yet</h3>
          <p className="text-gray-400 mb-6">Start by adding your first bank account or card</p>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors">
            Add Your First Account
          </button>
        </div>
      </div>
    </div>
  )
}
