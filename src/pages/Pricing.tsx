import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, TrendingUp, BarChart3, Lock } from 'lucide-react';
import { createPageUrl } from '@/utils/urls';

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

  const handleUpgrade = () => {
    // Stripe should redirect to: https://yourdomain.com/thank-you?token={CHECKOUT_SESSION_ID}
    // Configure this in your Stripe Dashboard under Payment Link settings
    window.open('https://buy.stripe.com/test_fZubJ12hF46gahf5PffUQ01', '_blank');
  };

  return (
    <div className="min-h-screen bg-black text-[#c4c4c6] px-6 py-12">
      <div className="max-w-6xl mx-auto">
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
          <br />
          <a href="/activate" className="text-[#3dd98f] hover:underline text-xs mt-2 inline-block">
            Already paid? Activate your premium here →
          </a>
        </motion.p>
      </div>
    </div>
  );
}
