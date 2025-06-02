export default function WorkoutsPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Workouts</h1>
            <p className="text-gray-400">Track your training sessions and exercises</p>
          </div>
          <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
            Log Workout
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">This Week</h3>
            <p className="text-3xl font-bold text-green-400">0</p>
            <p className="text-gray-400 text-sm mt-2">Workouts completed</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Total Time</h3>
            <p className="text-3xl font-bold text-blue-400">0h</p>
            <p className="text-gray-400 text-sm mt-2">Training time</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Streak</h3>
            <p className="text-3xl font-bold text-purple-400">0</p>
            <p className="text-gray-400 text-sm mt-2">Days in a row</p>
          </div>
        </div>

        {/* Empty state */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
          <div className="text-6xl mb-4">💪</div>
          <h3 className="text-xl font-semibold text-white mb-2">Start Your Fitness Journey</h3>
          <p className="text-gray-400 mb-6">Log your first workout to begin tracking your progress</p>
          <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors">
            Log Your First Workout
          </button>
        </div>
      </div>
    </div>
  )
}
