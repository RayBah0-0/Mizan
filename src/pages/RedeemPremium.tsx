import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, AlertTriangle, ShieldCheck } from 'lucide-react';
import ConfettiBurst from '@/components/ConfettiBurst';
import { redeemPremiumToken } from '@/utils/api';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { createPageUrl } from '@/utils/urls';

export default function RedeemPremium() {
  const { token: rawToken } = useParams();
  const navigate = useNavigate();
  const { user } = useClerkAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const redeem = async () => {
      const token = rawToken ? decodeURIComponent(rawToken) : '';

      if (!token) {
        setStatus('error');
        setMessage('Activation link is missing.');
        return;
      }
      if (!user) {
        setStatus('error');
        setMessage('Please log in to claim your premium.');
        return;
      }
      setStatus('loading');
      try {
        const result = await redeemPremiumToken(token);
        setStatus('success');
        setMessage(result.message || 'Premium activated for 1 year.');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Failed to redeem premium.');
      }
    };

    redeem();
  }, [rawToken, user]);

  const goToDashboard = () => navigate(createPageUrl('Dashboard'));
  const goToLogin = () => navigate(createPageUrl('Access'));

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <div className="min-h-screen bg-black text-[#c4c4c6] flex items-center justify-center px-6 py-16 relative">
      {isSuccess && <ConfettiBurst />}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full border border-[#1a1a1d] bg-[#0a0a0b] p-10 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#2d4a3a] flex items-center justify-center">
            {isError ? (
              <AlertTriangle className="w-8 h-8 text-red-400" />
            ) : (
              <Crown className="w-8 h-8 text-[#3dd98f]" />
            )}
          </div>

          <h1 className="text-3xl font-light tracking-wide">
            {isSuccess ? 'Premium received' : 'Activating premium...'}
          </h1>
          <p className="text-[#8a8a8d] text-sm max-w-md leading-relaxed">
            {message || 'Validating your activation link. This only takes a moment.'}
          </p>

          {isLoading && (
            <div className="w-full h-1 bg-[#151515] rounded-full overflow-hidden">
              <div className="h-full bg-[#3dd98f] animate-pulse" />
            </div>
          )}

          {isSuccess && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-full bg-[#0e0e10] border border-[#1a1a1d] p-6 text-left"
            >
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#3dd98f] mt-0.5" />
                <div className="space-y-1 text-sm text-[#c4c4c6]">
                  <p>1-year premium unlocked.</p>
                  <p className="text-[#6a6a6d] text-xs">This link is now marked as used.</p>
                </div>
              </div>
            </motion.div>
          )}

          {isError && (
            <p className="text-xs text-red-400">{message}</p>
          )}

          <div className="flex gap-3 mt-4">
            {isSuccess && (
              <button
                onClick={goToDashboard}
                className="px-5 py-3 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] font-semibold text-sm tracking-wide transition-all duration-300"
              >
                Go to Dashboard
              </button>
            )}
            {isError && !user && (
              <button
                onClick={goToLogin}
                className="px-5 py-3 bg-[#1f1f22] hover:bg-[#2a2a2d] text-[#c4c4c6] font-semibold text-sm tracking-wide transition-all duration-300"
              >
                Login to claim
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
