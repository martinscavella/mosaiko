export default function LearningProgressPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Learning Progress</h1>
          <p className="text-gray-400">Track your educational journey and achievements</p>
        </div>

        {/* Progress overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Courses Completed</h3>
            <p className="text-3xl font-bold text-purple-400">0</p>
            <p className="text-gray-400 text-sm mt-2">Total courses</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Hours Studied</h3>
            <p className="text-3xl font-bold text-blue-400">0h</p>
            <p className="text-gray-400 text-sm mt-2">Learning time</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Certificates</h3>
            <p className="text-3xl font-bold text-yellow-400">0</p>
            <p className="text-gray-400 text-sm mt-2">Earned certificates</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Study Streak</h3>
            <p className="text-3xl font-bold text-green-400">0</p>
            <p className="text-gray-400 text-sm mt-2">Days in a row</p>
          </div>
        </div>

        {/* Progress charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Weekly Study Time</h3>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-400">No study data yet</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Course Progress</h3>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">📈</div>
                <p className="text-gray-400">No courses enrolled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Skills development */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Skills Development</h2>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎯</div>
              <p className="text-gray-400">Start learning to track your skill development</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
