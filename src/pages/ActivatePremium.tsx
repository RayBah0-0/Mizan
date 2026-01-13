import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Check, AlertCircle } from 'lucide-react';
import { activateWithCode } from '@/lib/premium';
import { createPageUrl } from '@/utils/urls';

export default function ActivatePremium() {
  const [activationCode, setActivationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleActivate = async () => {
    if (!activationCode.trim()) {
      setError('Please enter your activation code from Stripe payment confirmation.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userId = JSON.parse(localStorage.getItem('mizan_v1_user') || '""');
      const activated = await activateWithCode(activationCode, userId);
      
      if (activated) {
        setSuccess(true);
        setTimeout(() => {
          // Force full page reload to refresh premium status everywhere
          window.location.href = createPageUrl('Dashboard');
        }, 2000);
      } else {
        setError('Invalid activation code. Please check and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to activate premium. Please contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#c4c4c6] px-6 py-12 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <Crown className="w-16 h-16 text-[#3dd98f] mx-auto mb-4" />
          <h1 className="text-3xl font-light tracking-wide mb-2">
            Activate Premium
          </h1>
          <p className="text-[#6a6a6d] text-sm">
            Enter your activation code to unlock premium features
          </p>
        </div>

        {!success ? (
          <div className="space-y-6">
            <div>
              <label className="text-[#8a8a8d] text-xs block mb-2">
                Activation Code
              </label>
              <input
                type="text"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                placeholder="Enter code from email..."
                className="w-full bg-[#0e0e10] border border-[#1a1a1d] focus:border-[#2d4a3a] text-[#c4c4c6] px-4 py-3 text-sm tracking-wide outline-none transition-all duration-300"
                disabled={isLoading}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-900/20 border border-red-900/30"
              >
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              onClick={handleActivate}
              disabled={isLoading}
              className="w-full py-3 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] font-semibold text-sm tracking-wide transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                'Activating...'
              ) : (
                <>
                  <Crown className="w-4 h-4" />
                  Activate Premium
                </>
              )}
            </button>

            <p className="text-xs text-[#4a4a4d] text-center">
              Activation codes are sent to your email after payment.
              <br />
              Need help? Contact support.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center p-8 border border-[#2d4a3a] bg-[#1a2f23]/20"
          >
            <Check className="w-16 h-16 text-[#3dd98f] mx-auto mb-4" />
            <p className="text-lg mb-2">Premium Activated!</p>
            <p className="text-sm text-[#6a6a6d]">
              Redirecting to dashboard...
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
