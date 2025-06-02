export default function FinanceSettingsPage() {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Finance Settings</h1>
          <p className="text-gray-400">Configure your financial preferences</p>
        </div>

        <div className="space-y-6">
          {/* Currency Settings */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Currency & Region</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Default Currency</label>
                <select className="w-full bg-black/20 text-white border border-white/20 rounded-lg px-3 py-2">
                  <option value="EUR">EUR - Euro (€)</option>
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="GBP">GBP - British Pound (£)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Date Format</label>
                <select className="w-full bg-black/20 text-white border border-white/20 rounded-lg px-3 py-2">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Budget Settings */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Budget & Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white">Budget Alerts</h4>
                  <p className="text-gray-400 text-sm">Get notified when approaching budget limits</p>
                </div>
                <input type="checkbox" className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white">Goal Reminders</h4>
                  <p className="text-gray-400 text-sm">Weekly reminders about your financial goals</p>
                </div>
                <input type="checkbox" className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white">Monthly Reports</h4>
                  <p className="text-gray-400 text-sm">Automatic monthly financial summary</p>
                </div>
                <input type="checkbox" className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Data Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="bg-blue-500/20 text-blue-300 py-3 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors">
                Export Data
              </button>
              <button className="bg-green-500/20 text-green-300 py-3 rounded-lg border border-green-500/30 hover:bg-green-500/30 transition-colors">
                Import Data
              </button>
              <button className="bg-yellow-500/20 text-yellow-300 py-3 rounded-lg border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors">
                Backup Data
              </button>
              <button className="bg-red-500/20 text-red-300 py-3 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors">
                Clear All Data
              </button>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Privacy & Security</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white">Two-Factor Authentication</h4>
                  <p className="text-gray-400 text-sm">Add extra security to your account</p>
                </div>
                <button className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm">
                  Enable
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white">Data Encryption</h4>
                  <p className="text-gray-400 text-sm">Encrypt sensitive financial data</p>
                </div>
                <span className="text-green-400 text-sm">✓ Enabled</span>
              </div>
            </div>
          </div>

          {/* Save Changes */}
          <div className="flex justify-end space-x-4">
            <button className="px-6 py-3 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors">
              Cancel
            </button>
            <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
