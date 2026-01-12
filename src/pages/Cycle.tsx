import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, BookOpen } from 'lucide-react';
import { useCycle } from '@/hooks/useCycle';
import { CycleGrid } from '@/components/CycleGrid';
import { createPageUrl } from '@/utils/urls';
import { NiyyahModal } from '@/components/NiyyahModal';
import { getPremiumStatus } from '@/lib/premium';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { generateCycleReflection } from '@/utils/cycleReflection';

export default function Cycle() {
  const navigate = useNavigate();
  const { user } = useClerkAuth();
  const premium = getPremiumStatus(user?.id);
  const { cycles, cyclesCompleted, currentProgress, setCurrentNiyyah, getCurrentNiyyah } = useCycle();
  const previous = cycles.length > 1 ? cycles[cycles.length - 2] : null;
  const [showNiyyahModal, setShowNiyyahModal] = useState(false);
  const [hasShownNiyyah, setHasShownNiyyah] = useState(false);
  const currentNiyyah = getCurrentNiyyah();
  
  // Generate reflection for completed previous cycle
  const previousReflection = previous && previous.days.length === 7 && premium.active 
    ? generateCycleReflection(previous.days) 
    : null;

  // Show Niyyah modal for premium users when starting new cycle (currentProgress === 0)
  // Debug: log the conditions
  useEffect(() => {
    console.log('Niyyah Check:', {
      premiumActive: premium.active,
      currentProgress,
      currentNiyyah,
      hasShownNiyyah,
      cyclesLength: cycles.length
    });
    
    if (premium.active && currentProgress === 0 && !currentNiyyah && !hasShownNiyyah) {
      console.log('Showing Niyyah modal in 500ms...');
      const timer = setTimeout(() => {
        setShowNiyyahModal(true);
        setHasShownNiyyah(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [premium.active, currentProgress, currentNiyyah, hasShownNiyyah, cycles.length]);

  const handleNiyyahSubmit = (intention: string) => {
    setCurrentNiyyah(intention);
    setShowNiyyahModal(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] px-6 py-12 md:py-20">
      <div className="max-w-lg mx-auto">

        <NiyyahModal 
          isOpen={showNiyyahModal}
          onClose={() => setShowNiyyahModal(false)}
          onSubmit={handleNiyyahSubmit}
        />

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="mb-8">
          <motion.h1 
            className="text-[#c4c4c6] text-xl tracking-wide mb-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Cycles
          </motion.h1>
          <motion.p 
            className="text-[#4a4a4d] text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            Seven completed days = one cycle.
          </motion.p>
        </motion.div>

        {/* Show Niyyah if set (Premium feature) */}
        {currentNiyyah && premium.active && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mb-6 p-4 bg-[#0e0e10] border border-[#2d4a3a]/30 rounded"
          >
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-[#3dd98f]" />
              <p className="text-xs text-[#6a6a6d] uppercase tracking-wide">Your Niyyah</p>
            </div>
            <p className="text-sm text-[#c4c4c6] leading-relaxed">{currentNiyyah}</p>
          </motion.div>
        )}

        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.15, delayChildren: 0.4 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ borderColor: ['#1a1a1d', '#2a2a2d', '#1a1a1d'] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <CycleGrid filled={currentProgress} label={`Current (${currentProgress}/7)`} />
            </motion.div>
          </motion.div>
          
          {previous && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <CycleGrid filled={previous.days.length} label={`Previous (${previous.days.length}/7)`} />
              </motion.div>
              
              {/* Cycle Reflection Summary - Premium */}
              {previousReflection && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                  className="p-6 bg-[#0e0e10] border border-[#2d4a3a]/30 rounded space-y-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-[#3dd98f]" />
                    <h3 className="text-sm text-[#c4c4c6] font-medium">Cycle Reflection</h3>
                  </div>
                  
                  <div>
                    <p className="text-xs text-[#6a6a6d] uppercase tracking-wide mb-2">What Improved</p>
                    <p className="text-sm text-[#c4c4c6] leading-relaxed">{previousReflection.improvements}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-[#6a6a6d] uppercase tracking-wide mb-2">Where to Focus</p>
                    <p className="text-sm text-[#c4c4c6] leading-relaxed">{previousReflection.weaknesses}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-[#6a6a6d] uppercase tracking-wide mb-2">Strongest Area</p>
                    <p className="text-sm text-[#c4c4c6] leading-relaxed">{previousReflection.strongestArea}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-[#1a1a1d]">
                    <p className="text-xs text-[#6a6a6d] uppercase tracking-wide mb-2">Reflect On This</p>
                    <p className="text-sm text-[#3dd98f] leading-relaxed italic">{previousReflection.reflectionQuestion}</p>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: previous ? 1.1 : 0.95 }}
          className="mt-16 flex items-center justify-center gap-8"
        >
          <Link
            to={createPageUrl('CheckIn')}
            className="text-[#3a3a3d] hover:text-[#6a6a6d] text-xs tracking-wide transition-colors duration-300"
          >
            Daily check-in
          </Link>
          <div className="w-1 h-1 bg-[#2a2a2d] rounded-full" />
          <Link
            to={createPageUrl('Status')}
            className="text-[#3a3a3d] hover:text-[#6a6a6d] text-xs tracking-wide transition-colors duration-300"
          >
            Status
          </Link>
          <div className="w-1 h-1 bg-[#2a2a2d] rounded-full" />
          <Link
            to={createPageUrl('Settings')}
            className="text-[#3a3a3d] hover:text-[#6a6a6d] text-xs tracking-wide transition-colors duration-300"
          >
            Settings
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
