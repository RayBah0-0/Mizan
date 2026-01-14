import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Heart, Sparkles, X } from 'lucide-react';
import ConfettiBurst from './ConfettiBurst';

interface PremiumWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: 'yearly' | 'commitment' | 'lifetime' | 'monthly' | 'admin';
  adminGrantInfo?: {
    duration_days: number;
    note: string;
  };
}

const getPlanMessage = (plan: string, adminGrantInfo?: { duration_days: number; note: string }) => {
  if (plan === 'admin' && adminGrantInfo) {
    const durationText = adminGrantInfo.duration_days === 365 
      ? '1 Year'
      : adminGrantInfo.duration_days === 30
      ? '1 Month'
      : adminGrantInfo.duration_days === 90
      ? '90 Days'
      : `${adminGrantInfo.duration_days} Days`;

    return {
      title: 'Premium Access Granted by Admin',
      subtitle: 'Admin Grant',
      message: adminGrantInfo.note || 'An administrator has granted you Premium access.',
      affirmation: 'Your premium features are now active. Make the most of this opportunity!',
      duration: durationText
    };
  }
  
  if (plan === 'admin') {
    return {
      title: 'Premium Access Granted',
      subtitle: 'Admin Grant',
      message: 'You have been granted Premium access by an administrator.',
      affirmation: 'Your premium features are now active.',
      duration: 'Active'
    };
  }

  switch (plan) {
    case 'lifetime':
      return {
        title: 'Welcome to Your Lifetime Journey',
        subtitle: 'Premium for Life',
        message: 'You\'ve made a profound commitment to self-improvement. This is more than a purchase—it\'s a declaration that spiritual growth is part of who you are.',
        affirmation: 'Your dedication to becoming better starts now, and it never expires.',
        duration: 'Forever'
      };
    case 'yearly':
      return {
        title: 'Your Year of Transformation Begins',
        subtitle: 'Premium for 1 Year',
        message: 'Twelve months to deepen your practice, understand your patterns, and strengthen your connection. One year can change everything.',
        affirmation: 'Every reflection, every insight—tools for becoming who you\'re meant to be.',
        duration: '365 Days'
      };
    case 'commitment':
      return {
        title: '90 Days of Intentional Growth',
        subtitle: 'Commitment Pass Active',
        message: 'You\'ve committed to 90 days of deeper practice. Three months to build lasting habits, understand yourself better, and grow closer to Allah.',
        affirmation: 'Transformation doesn\'t need forever. It just needs commitment.',
        duration: '90 Days'
      };
    default:
      return {
        title: 'Welcome to Premium',
        subtitle: 'Your Journey Begins',
        message: 'You\'ve taken the first step toward understanding your spiritual journey more deeply.',
        affirmation: 'Every step forward is a victory.',
        duration: 'Active Now'
      };
  }
};

export default function PremiumWelcomeModal({ isOpen, onClose, plan, adminGrantInfo }: PremiumWelcomeModalProps) {
  const content = getPlanMessage(plan, adminGrantInfo);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <ConfettiBurst />
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
              className="bg-[#0a0a0b] border-2 border-[#2d4a3a] rounded-lg max-w-lg w-full p-8 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-[#6a6a6d] hover:text-[#c4c4c6] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon and badge */}
              <div className="flex flex-col items-center mb-6">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="mb-4 relative"
                >
                  <div className="absolute inset-0 bg-[#3dd98f] blur-2xl opacity-30 rounded-full"></div>
                  <Crown className="w-16 h-16 text-[#3dd98f] relative z-10" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#3dd98f] border border-[#3dd98f] rounded-full"
                >
                  <Sparkles className="w-4 h-4 text-[#0a0a0a]" />
                  <span className="text-xs font-semibold text-[#0a0a0a] uppercase tracking-wider">
                    {content.subtitle}
                  </span>
                </motion.div>
              </div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-2xl font-light text-[#c4c4c6] text-center mb-4 tracking-wide"
              >
                {content.title}
              </motion.h2>

              {/* Message */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-sm text-[#8a8a8d] text-center leading-relaxed mb-6"
              >
                {content.message}
              </motion.p>

              {/* Affirmation box */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="bg-[#0e0e10] border border-[#2d4a3a]/40 rounded-lg p-4 mb-6"
              >
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-[#3dd98f] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#c4c4c6] italic leading-relaxed">
                    {content.affirmation}
                  </p>
                </div>
              </motion.div>

              {/* Duration badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2d4a3a] to-[#1a3a2a] rounded-lg border border-[#3dd98f]/20">
                  <span className="text-lg font-semibold text-[#3dd98f]">{content.duration}</span>
                  <span className="text-xs text-[#6a6a6d]">of Premium Access</span>
                </div>
              </motion.div>

              {/* Call to action */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                onClick={onClose}
                whileHover={{ scale: 1.02, backgroundColor: '#3d5a4a' }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-6 py-3 bg-[#2d4a3a] text-[#0a0a0a] font-semibold text-sm tracking-wide rounded-lg transition-all duration-300"
              >
                Begin Your Journey
              </motion.button>

              {/* Subtle note */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-xs text-[#4a4a4d] text-center mt-4"
              >
                Premium features are now available throughout Mizan
              </motion.p>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
