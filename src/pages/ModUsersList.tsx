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

export default function ModUsersList() {
  const navigate = useNavigate();
  const { isMod, modLevel, loading: modLoading } = useMod();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    if (!modLoading && !isMod) {
      navigate('/dashboard');
      return;
    }

    if (isMod) {
      loadUsers();
    }
  }, [isMod, modLoading, navigate, page, search]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getModUsers(page, 50, search);
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  if (modLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/mod')}
              className="text-purple-300 hover:text-purple-100 mb-2 flex items-center gap-2"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-white">All Users</h1>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by username or email..."
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300"
            />
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setPage(1);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Users Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          {loading ? (
            <div className="text-center text-white py-8">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center text-purple-200 py-8">No users found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-purple-200 border-b border-white/20">
                      <th className="pb-3">ID</th>
                      <th className="pb-3">Username</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Source</th>
                      <th className="pb-3">Joined</th>
                      <th className="pb-3">Premium Until</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-3 text-purple-200 text-sm">{user.id}</td>
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
                        <td className="py-3">
                          {user.premium_source ? (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              user.premium_source === 'stripe' ? 'bg-green-500/20 text-green-300' :
                              user.premium_source === 'manual_override' ? 'bg-orange-500/20 text-orange-300' :
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              {user.premium_source}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 text-purple-200 text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-purple-200 text-sm">
                          {user.premium_until 
                            ? new Date(user.premium_until).toLocaleDateString()
                            : '-'
                          }
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-white px-4">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
