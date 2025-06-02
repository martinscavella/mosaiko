export default function CoursesPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Courses</h1>
            <p className="text-gray-400">Explore and enroll in learning courses</p>
          </div>
          <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors">
            Browse Catalog
          </button>
        </div>

        {/* Course categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-2">Technology</h3>
            <p className="text-gray-400 text-sm mb-4">Programming, AI, Web Development</p>
            <div className="text-2xl mb-2">💻</div>
            <p className="text-purple-400 font-semibold">0 courses</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-2">Business</h3>
            <p className="text-gray-400 text-sm mb-4">Marketing, Finance, Management</p>
            <div className="text-2xl mb-2">💼</div>
            <p className="text-purple-400 font-semibold">0 courses</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-2">Personal</h3>
            <p className="text-gray-400 text-sm mb-4">Health, Productivity, Skills</p>
            <div className="text-2xl mb-2">🌟</div>
            <p className="text-purple-400 font-semibold">0 courses</p>
          </div>
        </div>

        {/* My courses */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">My Courses</h2>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Enrolled Courses</h3>
            <p className="text-gray-400 mb-6">Start your learning journey by enrolling in your first course</p>
            <button className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg transition-colors">
              Explore Courses
            </button>
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Recent Activity</h2>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📖</div>
              <p className="text-gray-400">No recent learning activity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
