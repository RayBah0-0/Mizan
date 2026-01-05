import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeartHandshake, Sparkles, LockOpen } from 'lucide-react';
import { createPremiumTokenFromStripe } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ThankYou() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const stripeSessionId = searchParams.get('token') || '';
  const [isGenerating, setIsGenerating] = useState(false);
  const [activationToken, setActivationToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (stripeSessionId && user && !activationToken && !isGenerating) {
      setIsGenerating(true);
      createPremiumTokenFromStripe(stripeSessionId)
        .then((result) => {
          setActivationToken(result.token);
        })
        .catch((err) => {
          setError(err.message || 'Failed to generate activation code');
        })
        .finally(() => {
          setIsGenerating(false);
        });
    }
  }, [stripeSessionId, user, activationToken, isGenerating]);

  const handleAccept = () => {
    if (!activationToken) return;
    navigate(`/getpremium-${encodeURIComponent(activationToken)}`);
  };

  return (
    <div className="min-h-screen bg-black text-[#c4c4c6] flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full border border-[#1a1a1d] bg-[#0a0a0b] p-10 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-[#2d4a3a] flex items-center justify-center"
          >
            <HeartHandshake className="w-8 h-8 text-[#3dd98f]" />
          </motion.div>

          <h1 className="text-3xl font-light tracking-wide">Thank you for supporting Mizan</h1>
          <p className="text-[#8a8a8d] max-w-xl text-sm leading-relaxed">
            Your step is what keeps MIZAN alive. We pour every dollar back into building a calmer, more
            accountable experience for you.
          </p>

          <div className="mt-6 w-full max-w-md bg-[#0e0e10] border border-[#1a1a1d] p-6 text-left space-y-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#3dd98f]" />
              <p className="text-sm text-[#c4c4c6]">1 year of Premium unlocks immediately after you accept.</p>
            </div>
            <div className="flex items-center gap-3">
              <LockOpen className="w-5 h-5 text-[#3dd98f]" />
              <p className="text-sm text-[#c4c4c6]">The link is single-use and tied to your account.</p>
            </div>
          </div>

          <button
            onClick={handleAccept}
            disabled={!activationToken || isGenerating}
            className="mt-6 px-6 py-3 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] font-semibold text-sm tracking-wide transition-all duration-300 disabled:opacity-50"
          >
            {isGenerating ? 'Generating activation code...' : activationToken ? 'Accept your 1 year of Premium' : 'Missing activation token'}
          </button>

          {!stripeSessionId && !isGenerating && (
            <p className="text-xs text-[#6a6a6d] mt-2">
              We could not find an activation token in the link. Please open the link from your payment confirmation.
            </p>
          )}
          
          {error && (
            <p className="text-xs text-red-400 mt-2">
              {error}
            </p>
          )}
          
          {!user && stripeSessionId && (
            <p className="text-xs text-[#6a6a6d] mt-2">
              Please log in to claim your premium.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
