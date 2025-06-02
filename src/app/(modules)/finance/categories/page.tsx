export default function CategoriesPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Categories</h1>
            <p className="text-gray-400">Organize your transactions with categories</p>
          </div>
          <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors">
            Add Category
          </button>
        </div>

        {/* Category grid placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">📂</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Category {i}</h3>
                    <p className="text-gray-400 text-sm">Coming Soon</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-white">⋯</button>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-400">€0.00</p>
                <p className="text-gray-500 text-sm">0 transactions</p>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
          <div className="text-6xl mb-4">📂</div>
          <h3 className="text-xl font-semibold text-white mb-2">Organize Your Spending</h3>
          <p className="text-gray-400 mb-6">Create categories to better understand where your money goes</p>
          <button className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg transition-colors">
            Create Your First Category
          </button>
        </div>
      </div>
    </div>
  )
}
