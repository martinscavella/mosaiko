export default function GoalsPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Financial Goals</h1>
            <p className="text-gray-400">Set and track your savings objectives</p>
          </div>
          <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors">
            Add Goal
          </button>
        </div>

        {/* Goals grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Goal {i}</h3>
                <span className="text-2xl">🎯</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-white">0%</span>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Current</span>
                  <span className="text-white">€0</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Target</span>
                  <span className="text-yellow-400 font-semibold">€1,000</span>
                </div>
                
                <div className="pt-2 border-t border-white/10">
                  <p className="text-gray-400 text-sm">Coming Soon</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold text-white mb-2">Set Your Financial Goals</h3>
          <p className="text-gray-400 mb-6">Whether it&apos;s saving for a vacation or building an emergency fund</p>
          <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg transition-colors">
            Set Your First Goal
          </button>
        </div>
      </div>
    </div>
  )
}
