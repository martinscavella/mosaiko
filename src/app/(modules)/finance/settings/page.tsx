export default function FinanceSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Finance Settings</h1>
          <p className="text-gray-600">Configure your financial preferences</p>
        </div>

        <div className="space-y-6">
          {/* Currency Settings */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Currency & Region</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm mb-2">Default Currency</label>
                <select className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="EUR">EUR - Euro (€)</option>
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="GBP">GBP - British Pound (£)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-2">Date Format</label>
                <select className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Budget Settings */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget & Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-gray-900 font-medium">Budget Alerts</h4>
                  <p className="text-gray-600 text-sm">Get notified when approaching budget limits</p>
                </div>
                <input type="checkbox" className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-gray-900 font-medium">Goal Reminders</h4>
                  <p className="text-gray-600 text-sm">Weekly reminders about your financial goals</p>
                </div>
                <input type="checkbox" className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-gray-900 font-medium">Monthly Reports</h4>
                  <p className="text-gray-600 text-sm">Automatic monthly financial summary</p>
                </div>
                <input type="checkbox" className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="bg-blue-50 text-blue-600 py-3 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                Export Data
              </button>
              <button className="bg-green-50 text-green-600 py-3 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                Import Data
              </button>
              <button className="bg-yellow-50 text-yellow-600 py-3 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors">
                Backup Data
              </button>
              <button className="bg-red-50 text-red-600 py-3 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                Clear All Data
              </button>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Security</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-gray-900 font-medium">Two-Factor Authentication</h4>
                  <p className="text-gray-600 text-sm">Add extra security to your account</p>
                </div>
                <button className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors">
                  Enable
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-gray-900 font-medium">Data Encryption</h4>
                  <p className="text-gray-600 text-sm">Encrypt sensitive financial data</p>
                </div>
                <span className="text-green-600 text-sm font-medium">✓ Enabled</span>
              </div>
            </div>
          </div>

          {/* Save Changes */}
          <div className="flex justify-end space-x-4">
            <button className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
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
