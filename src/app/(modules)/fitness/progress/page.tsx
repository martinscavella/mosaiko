export default function FitnessProgressPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Progress</h1>
          <p className="text-gray-400">Track your fitness journey and improvements</p>
        </div>

        {/* Progress charts placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Weight Progress</h3>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-400">No weight data yet</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Workout Frequency</h3>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">📈</div>
                <p className="text-gray-400">No workout data yet</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Body Measurements</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Weight</span>
                <span className="text-white">-- kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Body Fat</span>
                <span className="text-white">--%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Muscle Mass</span>
                <span className="text-white">-- kg</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Personal Records</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Bench Press</span>
                <span className="text-white">-- kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Squat</span>
                <span className="text-white">-- kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deadlift</span>
                <span className="text-white">-- kg</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Recent Achievements</h3>
            <div className="text-center py-4">
              <div className="text-4xl mb-2">🏆</div>
              <p className="text-gray-400 text-sm">No achievements yet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
