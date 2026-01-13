import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMod } from '../contexts/ModContext';
import { getModAuditLogs } from '../utils/api';

interface AuditLog {
  id: number;
  mod_user_id: number;
  target_user_id: number | null;
  action_type: string;
  action_details: any;
  reason: string | null;
  ip_address: string | null;
  timestamp: string;
  mod_username: string;
  target_username: string | null;
}

export default function ModAuditLogs() {
  const navigate = useNavigate();
  const { isMod, loading: modLoading } = useMod();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    if (!modLoading && !isMod) {
      navigate('/dashboard');
      return;
    }

    if (isMod) {
      loadLogs();
    }
  }, [isMod, modLoading, navigate, page, filterType]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getModAuditLogs(page, 50, filterType || undefined);
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
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

  const actionTypeColors: Record<string, string> = {
    grant_premium: 'bg-green-500/20 text-green-300',
    revoke_premium: 'bg-red-500/20 text-red-300',
    view_premium_history: 'bg-blue-500/20 text-blue-300',
    view_user_activity: 'bg-purple-500/20 text-purple-300',
    view_mod_actions: 'bg-indigo-500/20 text-indigo-300',
    add_note: 'bg-yellow-500/20 text-yellow-300'
  };

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
            <h1 className="text-4xl font-bold text-white">Audit Logs</h1>
            <p className="text-purple-200 mt-1">All mod actions are recorded here</p>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <label className="text-purple-200 text-sm block mb-2">Filter by Action Type</label>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white"
          >
            <option value="">All Actions</option>
            <option value="grant_premium">Grant Premium</option>
            <option value="revoke_premium">Revoke Premium</option>
            <option value="view_premium_history">View Premium History</option>
            <option value="view_user_activity">View User Activity</option>
            <option value="add_note">Add Note</option>
          </select>
        </div>

        {/* Logs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          {loading ? (
            <div className="text-center text-white py-8">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center text-purple-200 py-8">No logs found</div>
          ) : (
            <>
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          actionTypeColors[log.action_type] || 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {log.action_type.replace(/_/g, ' ')}
                        </span>
                        {log.target_username && (
                          <button
                            onClick={() => navigate(`/mod/users/${log.target_user_id}`)}
                            className="text-purple-300 hover:text-purple-100 text-sm font-medium"
                          >
                            → {log.target_username}
                          </button>
                        )}
                      </div>
                      <span className="text-purple-200 text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-white text-sm mb-2">
                      <span className="text-purple-300">By:</span> {log.mod_username}
                    </div>

                    {log.reason && (
                      <div className="text-purple-200 text-sm mb-2">
                        <span className="text-purple-300">Reason:</span> {log.reason}
                      </div>
                    )}

                    {(log.action_type === 'grant_premium' || log.action_type === 'revoke_premium') && log.action_details && (
                      <div className="mt-3 p-3 bg-black/20 rounded border border-white/10">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-purple-300 mb-1">Before</div>
                            <div className="text-white">
                              {log.action_details.before?.subscription_tier || 'N/A'}
                            </div>
                            {log.action_details.before?.premium_until && (
                              <div className="text-purple-200 text-xs">
                                Until: {new Date(log.action_details.before.premium_until).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-purple-300 mb-1">After</div>
                            <div className="text-white">
                              {log.action_details.after?.subscription_tier || 'N/A'}
                            </div>
                            {log.action_details.after?.premium_until && (
                              <div className="text-purple-200 text-xs">
                                Until: {new Date(log.action_details.after.premium_until).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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
