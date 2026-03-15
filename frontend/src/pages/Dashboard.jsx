import { useState, useEffect } from 'react';
import axios from 'axios';
import { Phone, Calendar, MessageSquare, TrendingUp, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [callVolume, setCallVolume] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, volumeRes] = await Promise.all([
        axios.get('/api/analytics/dashboard'),
        axios.get('/api/analytics/call-volume?days=7')
      ]);
      setStats(statsRes.data);
      setCallVolume(volumeRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Calls',
      value: stats?.calls?.total_calls || 0,
      subtext: `${stats?.calls?.completed_calls || 0} completed`,
      icon: Phone,
      color: 'bg-blue-500'
    },
    {
      title: 'Appointments',
      value: stats?.appointments?.total_appointments || 0,
      subtext: `${stats?.appointments?.scheduled || 0} scheduled`,
      icon: Calendar,
      color: 'bg-green-500'
    },
    {
      title: 'Messages',
      value: stats?.messages?.total_messages || 0,
      subtext: `${stats?.messages?.unread || 0} unread`,
      icon: MessageSquare,
      color: 'bg-purple-500'
    },
    {
      title: 'Avg Duration',
      value: stats?.calls?.avg_duration ? `${Math.round(stats.calls.avg_duration / 60)}m` : '0m',
      subtext: `${Math.round((stats?.calls?.total_minutes || 0) / 60)} total hours`,
      icon: Clock,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.subtext}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Call Volume Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Call Volume (Last 7 Days)</h2>
          <TrendingUp size={20} className="text-gray-400" />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={callVolume}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="call_count" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Intent & Sentiment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Intents */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Call Intents</h2>
          <div className="space-y-3">
            {stats?.intents?.map((intent, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {intent.intent}
                </span>
                <span className="text-sm text-gray-600">{intent.count} calls</span>
              </div>
            ))}
            {(!stats?.intents || stats.intents.length === 0) && (
              <p className="text-sm text-gray-500">No data available yet</p>
            )}
          </div>
        </div>

        {/* Sentiment */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Sentiment</h2>
          <div className="space-y-3">
            {stats?.sentiment?.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    item.sentiment === 'positive' ? 'bg-green-500' :
                    item.sentiment === 'neutral' ? 'bg-gray-400' : 'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {item.sentiment}
                  </span>
                </div>
                <span className="text-sm text-gray-600">{item.count} calls</span>
              </div>
            ))}
            {(!stats?.sentiment || stats.sentiment.length === 0) && (
              <p className="text-sm text-gray-500">No data available yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
