export default function GoalsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Goals</h1>
            <p className="text-gray-600">Set and track your savings objectives</p>
          </div>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
            Add Goal
          </button>
        </div>

        {/* Goals grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Goal {i}</h3>
                <span className="text-2xl">🎯</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Progress</span>
                  <span className="text-gray-900">0%</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Current</span>
                  <span className="text-gray-900">€0</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Target</span>
                  <span className="text-blue-600 font-semibold">€1,000</span>
                </div>
                
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-gray-500 text-sm">Coming Soon</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Set Your Financial Goals</h3>
          <p className="text-gray-600 mb-6">Whether it&apos;s saving for a vacation or building an emergency fund</p>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors">
            Set Your First Goal
          </button>
        </div>
      </div>
    </div>
  )
}
