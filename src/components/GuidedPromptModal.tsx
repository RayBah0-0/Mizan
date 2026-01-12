import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';
import { GuidedPrompt, markPromptShown, saveGuidedReflection } from '@/utils/guidedPrompts';

interface GuidedPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: GuidedPrompt;
}

export default function GuidedPromptModal({ isOpen, onClose, prompt }: GuidedPromptModalProps) {
  const [response, setResponse] = useState('');

  const handleSubmit = () => {
    if (response.trim()) {
      saveGuidedReflection(prompt, response);
    }
    markPromptShown(prompt);
    setResponse('');
    onClose();
  };

  const handleSkip = () => {
    markPromptShown(prompt);
    setResponse('');
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
                  <Lightbulb className="w-5 h-5 text-[#3dd98f]" />
                </div>
                <div>
                  <h3 className="text-lg font-light text-[#c4c4c6]">A Moment to Reflect</h3>
                  <p className="text-xs text-[#6a6a6d]">{prompt.context}</p>
                </div>
              </div>

              <p className="text-base text-[#c4c4c6] mb-6 leading-relaxed">
                {prompt.question}
              </p>

              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Your reflection... (completely private)"
                maxLength={400}
                className="w-full px-4 py-3 bg-[#0a0a0b] border border-[#1a1a1d] text-[#c4c4c6] text-sm placeholder-[#6a6a6d] focus:border-[#3dd98f] focus:outline-none resize-none h-32 mb-2"
              />
              <p className="text-xs text-[#6a6a6d] mb-4 text-right">
                {response.length}/400
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  className="flex-1 py-2.5 border border-[#2a2a2d] text-[#8a8a8d] hover:text-[#c4c4c6] hover:border-[#3a3a3d] text-sm transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-2.5 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] font-medium text-sm transition-colors"
                >
                  {response.trim() ? 'Save Reflection' : 'Continue'}
                </button>
              </div>

              <p className="text-xs text-[#6a6a6d] text-center mt-4">
                These reflections are private and help you understand your journey.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
