import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, TrendingUp, BarChart3, Lock, Mail, FileText, Clock, CreditCard, X, Key } from 'lucide-react';
import { createPageUrl } from '@/utils/urls';
import { isPremiumEnabled, isPremiumExpired, activateWithCode, getPremiumExpiryDate } from '@/lib/premium';

const features = {
  free: [
    'Daily check-ins & tracking',
    'Basic analytics',
    'Streak tracking',
    '7-day cycle system',
    'Export last 30 days'
  ],
  premium: [
    'Everything in Free',
    'Advanced analytics & insights',
    'Full history export',
    'Priority support',
    'Custom categories',
    'Detailed progress charts',
    'Leaderboard rankings',
    'Mission & achievement tracking'
  ]
};

export default function Pricing() {
  const navigate = useNavigate();
  const [showPaymentStatus, setShowPaymentStatus] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [premiumStatus, setPremiumStatus] = useState<'none' | 'active' | 'expired'>('none');

  useEffect(() => {
    // Check premium status on component mount
    if (isPremiumEnabled()) {
      setPremiumStatus('active');
    } else if (isPremiumExpired()) {
      setPremiumStatus('expired');
    } else {
      setPremiumStatus('none');
    }
  }, []);

  const handleUpgrade = () => {
    // Open payment link and show payment status checker
    window.open('https://buy.stripe.com/test_fZubJ12hF46gahf5PffUQ01', '_blank');
    setShowPaymentStatus(true);
  };

  const handleActivateWithCode = () => {
    if (!activationCode.trim()) {
      setCodeError('Please enter your activation code');
      return;
    }

    if (activateWithCode(activationCode.trim())) {
      setCodeError('');
      setShowCodeInput(false);
      setPremiumStatus('active');
      alert('Premium activated successfully!');
    } else {
      setCodeError('Invalid activation code. Please check and try again.');
    }
  };

  const handleRenewal = () => {
    window.open('https://buy.stripe.com/test_fZubJ12hF46gahf5PffUQ01', '_blank');
  };

  if (showPaymentStatus) {
    return (
      <div className="min-h-screen bg-black text-[#c4c4c6] flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl w-full border border-[#1a1a1d] bg-[#0a0a0b] p-10 shadow-2xl text-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-[#2d4a3a] flex items-center justify-center mx-auto mb-6"
          >
            <CreditCard className="w-8 h-8 text-[#3dd98f]" />
          </motion.div>

          <h1 className="text-3xl font-light tracking-wide mb-4">Complete Your Payment</h1>
          <p className="text-[#8a8a8d] max-w-xl mx-auto text-sm leading-relaxed mb-6">
            Finish your payment on Stripe, then click the button below to verify and activate your premium account automatically.
          </p>

          <div className="bg-[#0e0e10] border border-[#1a1a1d] p-6 mb-6 text-left space-y-3">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-[#3dd98f]" />
              <p className="text-sm text-[#c4c4c6]">Use test card: 4242 4242 4242 4242</p>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#3dd98f]" />
              <p className="text-sm text-[#c4c4c6]">Payment verification takes 2-3 seconds</p>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-[#3dd98f]" />
              <p className="text-sm text-[#c4c4c6]">Premium activates immediately upon verification</p>
            </div>
          </div>

          {paymentStatus === 'success' && (
            <div className="bg-green-900/20 border border-green-500/30 p-4 mb-6 rounded">
              <p className="text-green-400 text-sm">✅ Payment verified! Premium activated successfully.</p>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="bg-red-900/20 border border-red-500/30 p-4 mb-6 rounded">
              <p className="text-red-400 text-sm">❌ Payment not found. Please complete payment first or contact support.</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleCheckPayment}
              disabled={isCheckingPayment || paymentStatus === 'success'}
              className="w-full px-6 py-3 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] font-semibold text-sm tracking-wide transition-all duration-300 disabled:opacity-50"
            >
              {isCheckingPayment ? 'Verifying Payment...' : paymentStatus === 'success' ? 'Premium Activated!' : 'Check Payment Status'}
            </button>

            <button
              onClick={() => setShowPaymentStatus(false)}
              className="w-full px-6 py-3 border border-[#1a1a1d] hover:bg-[#1a1a1d] text-[#c4c4c6] font-semibold text-sm tracking-wide transition-all duration-300"
            >
              Back to Pricing
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#c4c4c6] px-6 py-12">
      <div className="max-w-6xl mx-auto">

        {/* Premium Status Banner */}
        {premiumStatus === 'active' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 bg-[#1a1a1d]/50 border border-[#2d4a3a]/40 rounded-lg text-center"
          >
            <div className="flex items-center justify-center gap-2 text-[#3dd98f]">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-medium">Premium Plan Active</span>
            </div>
            {getPremiumExpiryDate() && (
              <p className="text-xs text-[#6a6a6d] mt-1">
                Expires: {getPremiumExpiryDate()?.toLocaleDateString()}
              </p>
            )}
          </motion.div>
        )}

        {/* Premium Expired Banner */}
        {premiumStatus === 'expired' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <X className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-medium">Premium Plan Expired</span>
              </div>
              <button
                onClick={handleRenewal}
                className="px-4 py-2 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] text-sm font-medium rounded transition-colors"
              >
                Renew Premium
              </button>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-light tracking-wide mb-4">
            Choose Your Path
          </h1>
          <p className="text-[#6a6a6d] text-lg">
            Start free, upgrade when you're ready for more power.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="p-8 border border-[#1a1a1d] bg-[#0a0a0b] hover:border-[#2a2a2d] transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-[#6a6a6d]" />
              <h2 className="text-2xl font-light">Free</h2>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-light">$0</span>
              <span className="text-[#6a6a6d] text-sm ml-2">forever</span>
            </div>
            <ul className="space-y-3 mb-8">
              {features.free.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 text-[#4a7a5a] mt-0.5 flex-shrink-0" />
                  <span className="text-[#8a8a8d]">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate(createPageUrl('Dashboard'))}
              className="w-full py-3 border border-[#2a2a2d] text-[#8a8a8d] hover:text-[#c4c4c6] hover:border-[#3a3a3d] text-sm tracking-wide transition-all duration-300"
            >
              Continue with Free
            </button>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="p-8 border-2 border-[#2d4a3a] bg-[#0a0a0b] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-[#2d4a3a] text-[#0a0a0a] text-xs font-semibold px-4 py-1">
              BEST VALUE
            </div>
            <div className="flex items-center gap-3 mb-4 mt-2">
              <Crown className="w-6 h-6 text-[#3dd98f]" />
              <h2 className="text-2xl font-light">Premium</h2>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-light">$10</span>
              <span className="text-[#6a6a6d] text-sm ml-2">/year</span>
            </div>
            <ul className="space-y-3 mb-8">
              {features.premium.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 text-[#3dd98f] mt-0.5 flex-shrink-0" />
                  <span className="text-[#c4c4c6]">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpgrade}
              className="w-full py-3 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] font-semibold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Upgrade to Premium
            </button>

            {/* More Visible "Already Paid?" Button */}
            {premiumStatus !== 'active' && (
              <div className="mt-4">
                <button
                  onClick={() => setShowCodeInput(!showCodeInput)}
                  className="w-full py-3 bg-[#1a1a1d] hover:bg-[#2a2a2d] border-2 border-dashed border-[#3dd98f]/50 text-[#3dd98f] font-medium text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  Already paid? Activate your premium here →
                </button>

                {/* Code Activation Input */}
                {showCodeInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-3"
                  >
                    <div>
                      <input
                        type="text"
                        value={activationCode}
                        onChange={(e) => setActivationCode(e.target.value)}
                        placeholder="Enter your activation code"
                        className="w-full px-4 py-3 bg-[#0a0a0b] border border-[#1a1a1d] text-[#c4c4c6] placeholder-[#6a6a6d] focus:border-[#3dd98f] focus:outline-none transition-colors"
                      />
                      {codeError && (
                        <p className="text-red-400 text-sm mt-1">{codeError}</p>
                      )}
                    </div>
                    <button
                      onClick={handleActivateWithCode}
                      className="w-full py-2 bg-[#3dd98f] hover:bg-[#4eeaa0] text-[#0a0a0a] font-medium text-sm transition-colors"
                    >
                      Activate Premium
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Additional Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          <div className="p-6 border border-[#1a1a1d] bg-[#0a0a0b] text-center">
            <TrendingUp className="w-8 h-8 text-[#3dd98f] mx-auto mb-3" />
            <h3 className="text-sm font-semibold mb-2">Advanced Insights</h3>
            <p className="text-xs text-[#6a6a6d]">
              Detailed charts and analytics to track your progress over time
            </p>
          </div>
          <div className="p-6 border border-[#1a1a1d] bg-[#0a0a0b] text-center">
            <BarChart3 className="w-8 h-8 text-[#3dd98f] mx-auto mb-3" />
            <h3 className="text-sm font-semibold mb-2">Full History</h3>
            <p className="text-xs text-[#6a6a6d]">
              Export and analyze your complete journey, not just recent data
            </p>
          </div>
          <div className="p-6 border border-[#1a1a1d] bg-[#0a0a0b] text-center">
            <Zap className="w-8 h-8 text-[#3dd98f] mx-auto mb-3" />
            <h3 className="text-sm font-semibold mb-2">Priority Support</h3>
            <p className="text-xs text-[#6a6a6d]">
              Get help faster with dedicated support channels
            </p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center text-[#4a4a4d] text-sm mt-12"
        >
          Annual subscription. Cancel anytime. No hidden fees.
        </motion.p>
      </div>
    </div>
  );
}
