import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMod } from '../contexts/ModContext';
import { 
  getModUserDetails, 
  getModUserActivity,
  getModUserPremiumHistory,
  grantPremium, 
  revokePremium 
} from '../utils/api';

interface UserDetail {
  id: number;
  username: string;
  email: string | null;
  clerk_id: string | null;
  created_at: string;
  subscription_tier: string;
  premium_until: string | null;
  premium_started_at: string | null;
  total_checkins: number;
  total_cycles: number;
  last_checkin_date: string | null;
  account_age_days: number;
  premium_source: string | null;
  premium_granted_by_mod_id: number | null;
  premium_override_reason: string | null;
}

export default function ModUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isMod, modLevel, loading: modLoading } = useMod();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [activity, setActivity] = useState<any>(null);
  const [premiumHistory, setPremiumHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [reason, setReason] = useState('');
  const [durationDays, setDurationDays] = useState(365);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!modLoading && !isMod) {
      navigate('/dashboard');
      return;
    }

    if (isMod && userId) {
      loadUserData();
    }
  }, [isMod, modLoading, navigate, userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [detailsData, activityData, historyData] = await Promise.all([
        getModUserDetails(parseInt(userId!)),
        getModUserActivity(parseInt(userId!)),
        getModUserPremiumHistory(parseInt(userId!))
      ]);
      
      setUser(detailsData.user);
      setActivity(activityData);
      setPremiumHistory(historyData);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPremium = async () => {
    if (!reason.trim()) {
      alert('Reason is required');
      return;
    }

    try {
      setActionLoading(true);
      await grantPremium(parseInt(userId!), reason, durationDays);
      setShowGrantModal(false);
      setReason('');
      await loadUserData();
    } catch (error: any) {
      alert(error.message || 'Failed to grant premium');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokePremium = async () => {
    if (!reason.trim()) {
      alert('Reason is required');
      return;
    }

    try {
      setActionLoading(true);
      await revokePremium(parseInt(userId!), reason);
      setShowRevokeModal(false);
      setReason('');
      await loadUserData();
    } catch (error: any) {
      alert(error.message || 'Failed to revoke premium');
    } finally {
      setActionLoading(false);
    }
  };

  if (modLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading user details...</div>
      </div>
    );
  }

  if (!isMod || !user) {
    return null;
  }

  const canModifyPremium = modLevel === 'full' || modLevel === 'super_admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/mod/users')}
            className="text-purple-300 hover:text-purple-100 mb-2 flex items-center gap-2"
          >
            ← Back to Users
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">{user.username}</h1>
          <p className="text-purple-200">User ID: {user.id}</p>
        </div>

        {/* User Info Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Account Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-purple-200 text-sm">Email</div>
              <div className="text-white font-medium">{user.email || 'N/A'}</div>
            </div>
            
            <div>
              <div className="text-purple-200 text-sm">Account Age</div>
              <div className="text-white font-medium">{user.account_age_days} days</div>
            </div>
            
            <div>
              <div className="text-purple-200 text-sm">Subscription Status</div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                user.subscription_tier === 'premium' 
                  ? 'bg-yellow-500/20 text-yellow-300' 
                  : 'bg-gray-500/20 text-gray-300'
              }`}>
                {user.subscription_tier}
              </span>
            </div>
            
            <div>
              <div className="text-purple-200 text-sm">Premium Source</div>
              <div className="text-white font-medium">
                {user.premium_source ? (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.premium_source === 'stripe' ? 'bg-green-500/20 text-green-300' :
                    user.premium_source === 'manual_override' ? 'bg-orange-500/20 text-orange-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {user.premium_source}
                  </span>
                ) : 'N/A'}
              </div>
            </div>
            
            <div>
              <div className="text-purple-200 text-sm">Premium Until</div>
              <div className="text-white font-medium">
                {user.premium_until 
                  ? new Date(user.premium_until).toLocaleDateString()
                  : 'N/A'
                }
              </div>
            </div>
            
            <div>
              <div className="text-purple-200 text-sm">Joined</div>
              <div className="text-white font-medium">
                {new Date(user.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {user.premium_override_reason && (
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <div className="text-orange-300 text-sm font-semibold mb-1">Manual Override Reason:</div>
              <div className="text-white">{user.premium_override_reason}</div>
            </div>
          )}

          {/* Actions */}
          {canModifyPremium && (
            <div className="flex gap-3 mt-6">
              {user.subscription_tier !== 'premium' ? (
                <button
                  onClick={() => setShowGrantModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Grant Premium
                </button>
              ) : user.premium_source !== 'stripe' && (
                <button
                  onClick={() => setShowRevokeModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Revoke Premium
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-purple-200 text-sm mb-2">Total Check-ins</div>
            <div className="text-4xl font-bold text-white">{user.total_checkins}</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-purple-200 text-sm mb-2">Total Cycles</div>
            <div className="text-4xl font-bold text-white">{user.total_cycles}</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-purple-200 text-sm mb-2">Last Check-in</div>
            <div className="text-xl font-bold text-white">
              {user.last_checkin_date 
                ? new Date(user.last_checkin_date).toLocaleDateString()
                : 'Never'
              }
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {activity && activity.checkins && activity.checkins.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Recent Check-ins</h2>
            <div className="space-y-2">
              {activity.checkins.slice(0, 10).map((checkin: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="text-white">
                    {new Date(checkin.date).toLocaleDateString()}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    checkin.completed ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                  }`}>
                    {checkin.completed ? 'Completed' : 'Incomplete'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Premium History */}
        {premiumHistory && premiumHistory.audit_log && premiumHistory.audit_log.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Premium History</h2>
            <div className="space-y-3">
              {premiumHistory.audit_log.map((log: any, idx: number) => (
                <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      log.action_type === 'grant_premium' 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {log.action_type === 'grant_premium' ? 'Granted' : 'Revoked'}
                    </span>
                    <span className="text-purple-200 text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-white text-sm mb-1">
                    By: <span className="font-semibold">{log.mod_username}</span>
                  </div>
                  {log.reason && (
                    <div className="text-purple-200 text-sm">
                      Reason: {log.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grant Premium Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4">Grant Premium</h3>
            
            <div className="mb-4">
              <label className="text-purple-200 text-sm block mb-2">Duration (days)</label>
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 365)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div className="mb-4">
              <label className="text-purple-200 text-sm block mb-2">Reason (required)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Support gesture, Trial extension"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white h-24 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGrantPremium}
                disabled={actionLoading || !reason.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-semibold transition-colors"
              >
                {actionLoading ? 'Granting...' : 'Grant Premium'}
              </button>
              <button
                onClick={() => {
                  setShowGrantModal(false);
                  setReason('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Premium Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4">Revoke Premium</h3>
            
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-300 text-sm">
                ⚠️ This will immediately revoke premium access for this user.
              </p>
            </div>

            <div className="mb-4">
              <label className="text-purple-200 text-sm block mb-2">Reason (required)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Manual correction, User request"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white h-24 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRevokePremium}
                disabled={actionLoading || !reason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-semibold transition-colors"
              >
                {actionLoading ? 'Revoking...' : 'Revoke Premium'}
              </button>
              <button
                onClick={() => {
                  setShowRevokeModal(false);
                  setReason('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
