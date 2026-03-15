import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Settings() {
  const [business, setBusiness] = useState(null);
  const [aiConfig, setAiConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [businessRes, configRes] = await Promise.all([
        axios.get('/api/business'),
        axios.get('/api/business/ai-config')
      ]);
      setBusiness(businessRes.data);
      setAiConfig(configRes.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAiConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await axios.put('/api/business/ai-config', aiConfig);
      setMessage('Settings saved successfully!');
    } catch (error) {
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your AI receptionist configuration</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Configuration</h2>
        <form onSubmit={handleSaveAiConfig} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Greeting Message
            </label>
            <textarea
              value={aiConfig?.greeting_message || ''}
              onChange={(e) => setAiConfig({ ...aiConfig, greeting_message: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Thank you for calling..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transfer Number (for escalations)
            </label>
            <input
              type="tel"
              value={aiConfig?.transfer_number || ''}
              onChange={(e) => setAiConfig({ ...aiConfig, transfer_number: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="+1234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Personality
            </label>
            <select
              value={aiConfig?.personality || 'professional'}
              onChange={(e) => setAiConfig({ ...aiConfig, personality: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
              <option value="casual">Casual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Instructions
            </label>
            <textarea
              value={aiConfig?.custom_instructions || ''}
              onChange={(e) => setAiConfig({ ...aiConfig, custom_instructions: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Additional instructions for the AI..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Business Name</label>
            <p className="mt-1 text-gray-900">{business?.business_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Industry</label>
            <p className="mt-1 text-gray-900">{business?.industry}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Phone Number</label>
            <p className="mt-1 text-gray-900">{business?.phone_number || 'Not configured'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Subscription Tier</label>
            <p className="mt-1">
              <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium capitalize">
                {business?.subscription_tier}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
