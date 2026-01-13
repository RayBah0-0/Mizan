import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, TrendingUp, BarChart3, Lock, Mail, FileText, Clock, CreditCard, X, Key } from 'lucide-react';
import { createPageUrl } from '@/utils/urls';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

const features = {
  free: [
    'All 5 daily prayers tracked',
    'Full check-in system',
    '7-day cycle accountability',
    'Basic progress tracking',
    'Mission system & ranks'
  ],
  yearly: [
    'Everything in Free',
    'Mirror Insights - pattern analysis',
    'Niyyah Mode - set intentions',
    'Cycle Reflections - written summaries',
    'Quiet Mode - hide gamification',
    'Rank Meanings - spiritual context',
    'Relapse Recovery - gentle return path',
    'Guided Prompts - reflection questions',
    'Advanced visual progress'
  ],
  commitment: [
    'Everything in Yearly',
    'Commit intentionally for 90 days',
    'Lower price for longer commitment',
    'Deepen your practice over time'
  ],
  lifetime: [
    'Everything in Yearly',
    'This is part of who I am',
    'One-time payment, forever access',
    'Never think about renewal again'
  ]
};

export default function Pricing() {
  const navigate = useNavigate();
  const { user, premiumStatus: premium } = useClerkAuth();
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const handleUpgrade = () => {
    // Open payment link in new tab
    window.open('https://buy.stripe.com/5kQbJ109xauE2ONelLfUQ06', '_blank');
  };

  const handleRenewal = () => {
    window.open('https://buy.stripe.com/5kQbJ109xauE2ONelLfUQ06', '_blank');
  };

  return (
    <div className="min-h-screen bg-black text-[#c4c4c6] px-6 py-12">
      <div className="max-w-6xl mx-auto">

        {/* Premium Status Banner */}
        {premium.active && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 bg-[#1a1a1d]/50 border border-[#2d4a3a]/40 rounded-lg text-center"
          >
            <div className="flex items-center justify-center gap-2 text-[#3dd98f]">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-medium">Premium Plan Active</span>
            </div>
            {premium.expiresAt && (
              <p className="text-xs text-[#6a6a6d] mt-1">
                Expires: {new Date(premium.expiresAt).toLocaleDateString()}
              </p>
            )}
          </motion.div>
        )}

        {/* Premium Expired Banner */}
        {premium.expiresAt && new Date(premium.expiresAt) < new Date() && (
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
              <motion.button
                onClick={handleRenewal}
                whileHover={{ scale: 1.05, backgroundColor: '#3d5a4a' }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="px-4 py-2 bg-[#2d4a3a] text-[#0a0a0a] text-sm font-medium rounded transition-colors"
              >
                Renew Premium
              </motion.button>
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
            Go Deeper
          </h1>
          <p className="text-[#6a6a6d] text-lg">
            Free tracks everything. Premium helps you understand it.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="p-6 border border-[#1a1a1d] bg-[#0a0a0b] hover:border-[#2a2a2d] transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-[#6a6a6d]" />
              <h2 className="text-xl font-light">Free</h2>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-light">$0</span>
              <span className="text-[#6a6a6d] text-xs ml-2">forever</span>
            </div>
            <ul className="space-y-2 mb-8 min-h-[200px]">
              {features.free.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <Check className="w-3 h-3 text-[#4a7a5a] mt-0.5 flex-shrink-0" />
                  <span className="text-[#8a8a8d]">{feature}</span>
                </li>
              ))}
            </ul>
            <motion.button
              onClick={() => navigate(createPageUrl('Dashboard'))}
              whileHover={{ scale: 1.02, borderColor: '#3a3a3d', color: '#c4c4c6' }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full py-2.5 border border-[#2a2a2d] text-[#8a8a8d] text-xs tracking-wide transition-all duration-300"
            >
              Start with Free
            </motion.button>
          </motion.div>

          {/* Yearly Premium */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="p-6 border-2 border-[#2d4a3a] bg-[#0a0a0b] relative overflow-hidden"
          >
            {premium.active ? (
              <div className="absolute top-0 right-0 bg-[#3dd98f] text-[#0a0a0a] text-xs font-semibold px-3 py-1">
                CURRENT PLAN
              </div>
            ) : (
              <div className="absolute top-0 right-0 bg-[#2d4a3a] text-[#0a0a0a] text-xs font-semibold px-3 py-1">
                POPULAR
              </div>
            )}
            <div className="flex items-center gap-3 mb-4 mt-2">
              <Crown className="w-5 h-5 text-[#3dd98f]" />
              <h2 className="text-xl font-light">Yearly</h2>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-light">$10</span>
              <span className="text-[#6a6a6d] text-xs ml-2">/year</span>
            </div>
            <ul className="space-y-2 mb-8 min-h-[200px]">
              {features.yearly.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <Check className="w-3 h-3 text-[#3dd98f] mt-0.5 flex-shrink-0" />
                  <span className="text-[#c4c4c6]">{feature}</span>
                </li>
              ))}
            </ul>
            {premium.active ? (
              <div className="w-full py-2.5 bg-[#0e0e10] border border-[#3dd98f] text-[#3dd98f] font-medium text-xs tracking-wide text-center">
                Active Until {premium.expiresAt ? new Date(premium.expiresAt).toLocaleDateString() : 'Lifetime'}
              </div>
            ) : (
              <motion.button
                onClick={handleUpgrade}
                whileHover={{ scale: 1.03, backgroundColor: '#3d5a4a', boxShadow: '0 10px 30px rgba(61,217,143,0.3)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="w-full py-2.5 bg-[#2d4a3a] text-[#0a0a0a] font-semibold text-xs tracking-wide transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Reflect Intentionally
              </motion.button>
            )}

            {!premium.active && (
              <div className="mt-3">
                <motion.button
                  onClick={() => setShowCodeInput(!showCodeInput)}
                  whileHover={{ scale: 1.02, backgroundColor: '#2a2a2d' }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="w-full py-2.5 bg-[#1a1a1d] border border-dashed border-[#3dd98f]/50 text-[#3dd98f] font-medium text-xs tracking-wide transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Key className="w-3 h-3" />
                  Already paid? Activate →
                </motion.button>

                {showCodeInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2"
                  >
                    <div>
                      <input
                        type="text"
                        value={activationCode}
                        onChange={(e) => setActivationCode(e.target.value)}
                        placeholder="Enter code (e.g., PREMIUM2025)"
                        className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#1a1a1d] text-[#c4c4c6] text-xs placeholder-[#6a6a6d] focus:border-[#3dd98f] focus:outline-none transition-colors"
                      />
                      {codeError && (
                        <p className="text-red-400 text-xs mt-1">{codeError}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>

          {/* Commitment Pass (3 months) - Hidden when premium active */}
          {!premium.active && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="p-6 border border-[#2d4a3a]/50 bg-[#0a0a0b] hover:border-[#2d4a3a] transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-[#3dd98f]" />
                <h2 className="text-xl font-light">Commitment Pass</h2>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-light">$9</span>
                <span className="text-[#6a6a6d] text-xs ml-2">/3 months</span>
              </div>
              <ul className="space-y-2 mb-8 min-h-[200px]">
                {features.commitment.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <Check className="w-3 h-3 text-[#3dd98f] mt-0.5 flex-shrink-0" />
                    <span className="text-[#c4c4c6]">{feature}</span>
                  </li>
                ))}
              </ul>
              <motion.button
                onClick={() => window.open('https://buy.stripe.com/7sY5kDe0n46ggFD6TjfUQ07', '_blank')}
                whileHover={{ scale: 1.03, backgroundColor: '#2d4a3a', boxShadow: '0 10px 30px rgba(61,217,143,0.3)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="w-full py-2.5 bg-[#1a1a1d] border border-[#3dd98f] text-[#3dd98f] font-medium text-xs tracking-wide transition-all duration-300"
              >
                Commit for 90 Days
              </motion.button>
            </motion.div>
          )}

          {/* Lifetime Access */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="p-6 border border-[#2d4a3a]/50 bg-[#0a0a0b] hover:border-[#2d4a3a] transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-[#3dd98f] text-[#0a0a0a] text-xs font-semibold px-3 py-1">
              BEST DEAL
            </div>
            <div className="flex items-center gap-3 mb-4 mt-2">
              <Crown className="w-5 h-5 text-[#3dd98f]" />
              <h2 className="text-xl font-light">Lifetime</h2>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-light">$49</span>
              <span className="text-[#6a6a6d] text-xs ml-2">once</span>
            </div>
            <ul className="space-y-2 mb-8 min-h-[200px]">
              {features.lifetime.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <Check className="w-3 h-3 text-[#3dd98f] mt-0.5 flex-shrink-0" />
                  <span className="text-[#c4c4c6]">{feature}</span>
                </li>
              ))}
            </ul>
            <motion.button
              onClick={() => window.open('https://buy.stripe.com/5kQcN57BZ0U4exv3H7fUQ08', '_blank')}
              whileHover={{ scale: 1.03, backgroundColor: '#3d5a4a', boxShadow: '0 15px 40px rgba(61,217,143,0.4)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="w-full py-2.5 bg-[#2d4a3a] text-[#0a0a0a] font-semibold text-xs tracking-wide transition-all duration-300"
            >
              This Is Who I Am
            </motion.button>
          </motion.div>
        </div>

        {/* Premium Philosophy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 max-w-5xl mx-auto"
        >
          <div className="p-8 border border-[#1a1a1d] bg-[#0a0a0b]">
            <h3 className="text-lg font-light mb-4 text-center">What Premium Means</h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <TrendingUp className="w-6 h-6 text-[#3dd98f] mx-auto mb-2" />
                <p className="text-xs text-[#8a8a8d]">
                  Pattern analysis that shows you where you're struggling — gently
                </p>
              </div>
              <div>
                <BarChart3 className="w-6 h-6 text-[#3dd98f] mx-auto mb-2" />
                <p className="text-xs text-[#8a8a8d]">
                  Reflection tools that help you understand your journey
                </p>
              </div>
              <div>
                <Zap className="w-6 h-6 text-[#3dd98f] mx-auto mb-2" />
                <p className="text-xs text-[#8a8a8d]">
                  Niyyah & intention-setting for deeper spiritual practice
                </p>
              </div>
            </div>
            <p className="text-xs text-[#6a6a6d] text-center mt-6">
              Free gives you everything you need. Premium helps you understand what you're doing.
            </p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center text-[#4a4a4d] text-xs mt-12"
        >
          All subscriptions can be cancelled anytime. No hidden fees. Your data stays yours.
        </motion.p>
      </div>
    </div>
  );
}
