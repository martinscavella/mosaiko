export default function NutritionPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Nutrition</h1>
            <p className="text-gray-400">Track your meals and nutritional intake</p>
          </div>
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors">
            Add Meal
          </button>
        </div>

        {/* Daily nutrition summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Calories</h3>
            <p className="text-3xl font-bold text-orange-400">0</p>
            <p className="text-gray-400 text-sm mt-2">of 2000 goal</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Protein</h3>
            <p className="text-3xl font-bold text-red-400">0g</p>
            <p className="text-gray-400 text-sm mt-2">of 150g goal</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Carbs</h3>
            <p className="text-3xl font-bold text-yellow-400">0g</p>
            <p className="text-gray-400 text-sm mt-2">of 250g goal</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Fat</h3>
            <p className="text-3xl font-bold text-purple-400">0g</p>
            <p className="text-gray-400 text-sm mt-2">of 70g goal</p>
          </div>
        </div>

        {/* Empty state */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
          <div className="text-6xl mb-4">🥗</div>
          <h3 className="text-xl font-semibold text-white mb-2">Track Your Nutrition</h3>
          <p className="text-gray-400 mb-6">Start logging your meals to understand your eating habits</p>
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors">
            Add Your First Meal
          </button>
        </div>
      </div>
    </div>
  )
}
