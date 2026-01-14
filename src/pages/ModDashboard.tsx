import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMod } from '../contexts/ModContext';
import { getModUsers } from '../utils/api';

interface User {
  id: number;
  username: string;
  email: string | null;
  created_at: string;
  subscription_tier: string;
  premium_until: string | null;
  premium_source: string | null;
}

export default function ModDashboard() {
  const navigate = useNavigate();
  const { isMod, modLevel, loading: modLoading } = useMod();
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    recentUsers: 0
  });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!modLoading && !isMod) {
      navigate('/dashboard');
      return;
    }

    if (isMod) {
      loadDashboard();
    }
  }, [isMod, modLoading, navigate]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await getModUsers(1, 10);
      
      setRecentUsers(data.users);
      setStats({
        totalUsers: data.pagination.total,
        premiumUsers: data.users.filter((u: User) => u.subscription_tier === 'premium').length,
        recentUsers: data.users.length
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (modLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading mod panel...</div>
      </div>
    );
  }

  if (!isMod) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Mod Panel</h1>
          <p className="text-purple-200">
            Access Level: <span className="font-semibold capitalize">{modLevel}</span>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-purple-200 text-sm mb-2">Total Users</div>
            <div className="text-4xl font-bold text-white">{stats.totalUsers}</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-purple-200 text-sm mb-2">Premium Users</div>
            <div className="text-4xl font-bold text-white">{stats.premiumUsers}</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-purple-200 text-sm mb-2">Recent Activity</div>
            <div className="text-4xl font-bold text-white">{stats.recentUsers}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => navigate('/mod/users')}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl p-6 text-left transition-colors"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="font-semibold">View All Users</div>
            <div className="text-sm text-purple-200">Browse and search users</div>
          </button>

          <button
            onClick={() => navigate('/mod/audit')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl p-6 text-left transition-colors"
          >
            <div className="text-2xl mb-2">📋</div>
            <div className="font-semibold">Audit Logs</div>
            <div className="text-sm text-indigo-200">View all mod actions</div>
          </button>

          <button
            onClick={() => navigate('/mod/search')}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-6 text-left transition-colors"
          >
            <div className="text-2xl mb-2">🔍</div>
            <div className="font-semibold">Search Users</div>
            <div className="text-sm text-blue-200">Advanced search filters</div>
          </button>
        </div>

        {/* Recent Users */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">Recent Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-purple-200 border-b border-white/20">
                  <th className="pb-3">Username</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Joined</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.id} className="border-b border-white/10 hover:bg-white/5">
                    <td className="py-3 text-white font-medium">{user.username}</td>
                    <td className="py-3 text-purple-200 text-sm">{user.email || 'N/A'}</td>
                    <td className="py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.subscription_tier === 'premium' 
                          ? 'bg-yellow-500/20 text-yellow-300' 
                          : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {user.subscription_tier}
                      </span>
                    </td>
                    <td className="py-3 text-purple-200 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => navigate(`/mod/users/${user.id}`)}
                        className="text-purple-300 hover:text-purple-100 text-sm font-medium"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
