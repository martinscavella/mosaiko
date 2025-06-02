export default function AchievementsPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Achievements</h1>
          <p className="text-gray-400">Celebrate your learning milestones and accomplishments</p>
        </div>

        {/* Achievement categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-center">
              <div className="text-4xl mb-2">🏆</div>
              <h3 className="text-white font-semibold mb-2">Course Completion</h3>
              <p className="text-gray-400 text-sm">0 achievements</p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-center">
              <div className="text-4xl mb-2">🎖️</div>
              <h3 className="text-white font-semibold mb-2">Study Streaks</h3>
              <p className="text-gray-400 text-sm">0 achievements</p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-center">
              <div className="text-4xl mb-2">⭐</div>
              <h3 className="text-white font-semibold mb-2">Special Milestones</h3>
              <p className="text-gray-400 text-sm">0 achievements</p>
            </div>
          </div>
        </div>

        {/* Recent achievements */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Recent Achievements</h2>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Achievements Yet</h3>
            <p className="text-gray-400 mb-6">Start learning to unlock your first achievement</p>
            <button className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg transition-colors">
              Start Learning
            </button>
          </div>
        </div>

        {/* Achievement progress */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Progress Towards Next Achievement</h2>
          <div className="space-y-4">
            {[
              { name: 'First Course', description: 'Complete your first course', progress: 0, target: 1 },
              { name: 'Study Streak', description: 'Study for 7 days in a row', progress: 0, target: 7 },
              { name: 'Knowledge Seeker', description: 'Complete 5 courses', progress: 0, target: 5 },
            ].map((achievement, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">{achievement.name}</h3>
                  <span className="text-gray-400 text-sm">{achievement.progress}/{achievement.target}</span>
                </div>
                <p className="text-gray-400 text-sm mb-3">{achievement.description}</p>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
