import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X } from 'lucide-react';

interface NiyyahModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (intention: string) => void;
}

export function NiyyahModal({ isOpen, onClose, onSubmit }: NiyyahModalProps) {
  const [intention, setIntention] = useState('');

  const handleSubmit = () => {
    if (intention.trim()) {
      onSubmit(intention.trim());
      setIntention('');
    }
  };

  const handleSkip = () => {
    onSubmit('');
    setIntention('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50"
            onClick={handleSkip}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div className="max-w-md w-full bg-[#0a0a0b] border border-[#2d4a3a]/50 p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-[#3dd98f]" />
                  <h2 className="text-lg text-[#c4c4c6] font-light tracking-wide">Set Your Niyyah</h2>
                </div>
                <button
                  onClick={handleSkip}
                  className="text-[#6a6a6d] hover:text-[#c4c4c6] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-[#8a8a8d] mb-6 leading-relaxed">
                Before beginning this cycle, set a private intention. This is between you and yourself.
              </p>

              <textarea
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder="What is your intention for these 7 days?"
                className="w-full h-32 px-4 py-3 bg-[#0e0e10] border border-[#1a1a1d] text-[#c4c4c6] text-sm placeholder-[#4a4a4d] focus:border-[#2d4a3a] focus:outline-none resize-none"
                maxLength={200}
              />

              <p className="text-xs text-[#4a4a4d] mt-2 mb-6">
                {intention.length}/200 characters
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  className="flex-1 px-4 py-3 border border-[#1a1a1d] text-[#8a8a8d] text-sm hover:text-[#c4c4c6] hover:border-[#2a2a2d] transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!intention.trim()}
                  className="flex-1 px-4 py-3 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Set intention
                </button>
              </div>

              <p className="text-xs text-[#4a4a4d] mt-4 text-center">
                Only you can see this. It will guide you through this cycle.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
