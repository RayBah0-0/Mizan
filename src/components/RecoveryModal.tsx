import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import { getRecoveryPrompts, saveRecoveryReflection } from '@/utils/relapseRecovery';

interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  consecutiveMisses: number;
  message: string;
}

export default function RecoveryModal({ isOpen, onClose, consecutiveMisses, message }: RecoveryModalProps) {
  const [reflection, setReflection] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const prompts = getRecoveryPrompts(consecutiveMisses);

  const handleSubmit = () => {
    if (reflection.trim()) {
      saveRecoveryReflection(reflection);
    }
    setReflection('');
    setSelectedPrompt(null);
    onClose();
  };

  const handleSkip = () => {
    setReflection('');
    setSelectedPrompt(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSkip}
            className="fixed inset-0 bg-black/80 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-[#0a0a0b] border border-[#2d4a3a] max-w-md w-full p-6 relative">
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 text-[#6a6a6d] hover:text-[#c4c4c6] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#2d4a3a]/20 rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-[#3dd98f]" />
                </div>
                <div>
                  <h3 className="text-lg font-light text-[#c4c4c6]">Return to the Path</h3>
                  <p className="text-xs text-[#6a6a6d]">{consecutiveMisses} days away</p>
                </div>
              </div>

              <p className="text-sm text-[#8a8a8d] mb-6 leading-relaxed">
                {message}
              </p>

              {/* Prompt Selection */}
              <div className="mb-4">
                <p className="text-xs text-[#6a6a6d] mb-2">Reflect on what happened (optional):</p>
                <div className="space-y-2">
                  {prompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedPrompt(prompt);
                        setReflection('');
                      }}
                      className={`w-full text-left px-3 py-2 text-xs border transition-colors ${
                        selectedPrompt === prompt
                          ? 'border-[#3dd98f] bg-[#2d4a3a]/10 text-[#c4c4c6]'
                          : 'border-[#1a1a1d] bg-[#0a0a0b] text-[#8a8a8d] hover:border-[#2a2a2d]'
                      }`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reflection Input */}
              {selectedPrompt && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4"
                >
                  <textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Your thoughts... (completely private)"
                    maxLength={300}
                    className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#1a1a1d] text-[#c4c4c6] text-xs placeholder-[#6a6a6d] focus:border-[#3dd98f] focus:outline-none resize-none h-24"
                  />
                  <p className="text-xs text-[#6a6a6d] mt-1 text-right">
                    {reflection.length}/300
                  </p>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  className="flex-1 py-2 border border-[#2a2a2d] text-[#8a8a8d] hover:text-[#c4c4c6] hover:border-[#3a3a3d] text-xs transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-2 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] font-medium text-xs transition-colors"
                >
                  {reflection.trim() ? 'Save & Continue' : 'Continue'}
                </button>
              </div>

              <p className="text-xs text-[#6a6a6d] text-center mt-4">
                No data is deleted. You can always return.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
