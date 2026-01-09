import React from 'react';
import { motion } from 'framer-motion';
import { SignInButton, SignUpButton } from '@clerk/clerk-react';

const AnimatedText = ({ children, delay = 0 }: { children: string; delay?: number }) => {
  const words = children.split(' ');
  return (
    <>
      {words.map((word, idx) => (
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.8,
            delay: delay + idx * 0.08,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          className="inline-block mr-[0.2em]"
        >
          {word}
        </motion.span>
      ))}
    </>
  );
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Animated background grid */}
      <motion.div
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 0.12 }}
        transition={{ duration: 1.4, ease: 'easeOut', delay: 0.1 }}
        className="absolute inset-0"
      >
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(138, 138, 141, 0.25) 1px, transparent 1px),
              linear-gradient(90deg, rgba(138, 138, 141, 0.25) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            transition: 'opacity 1.2s ease-out'
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="relative z-10 text-center max-w-2xl"
      >
        <motion.h1
          className="text-[#c4c4c6] text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-tight mb-8"
        >
          <AnimatedText delay={0.2}>Accountability is private.</AnimatedText>
        </motion.h1>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex gap-4 justify-center"
        >
          <SignInButton mode="modal">
            <motion.button 
              className="group relative px-8 py-4 bg-[#0f0f12] border border-[#2a2a2d] text-[#c4c4c6] text-sm tracking-[0.2em] uppercase transition-all duration-500 overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={(e) => {
                const elem = e.currentTarget;
                elem.style.borderColor = '#3a3a3d';
                elem.style.color = '#c4c4c6';
                elem.style.boxShadow = '0 0 16px rgba(45, 74, 58, 0.3)';
              }}
              onMouseLeave={(e) => {
                const elem = e.currentTarget;
                elem.style.borderColor = '#2a2a2d';
                elem.style.color = '#8a8a8d';
                elem.style.boxShadow = 'none';
              }}
            >
              <span className="relative z-10">Sign In</span>
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-[#1a2f23]/0 via-[#1a2f23]/20 to-[#1a2f23]/0"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
            </motion.button>
          </SignInButton>
          
          <SignUpButton mode="modal">
            <motion.button 
              className="group relative px-8 py-4 bg-[#2d4a3a] border border-[#3d5a4a] text-[#0a0a0a] text-sm tracking-[0.2em] uppercase transition-all duration-500 overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={(e) => {
                const elem = e.currentTarget;
                elem.style.backgroundColor = '#3d5a4a';
                elem.style.boxShadow = '0 0 20px rgba(61, 217, 143, 0.3)';
              }}
              onMouseLeave={(e) => {
                const elem = e.currentTarget;
                elem.style.backgroundColor = '#2d4a3a';
                elem.style.boxShadow = 'none';
              }}
            >
              <span className="relative z-10">Get Started</span>
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-[#3dd98f]/0 via-[#3dd98f]/20 to-[#3dd98f]/0"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
            </motion.button>
          </SignUpButton>
        </motion.div>
      </motion.div>

      {/* Scroll hint for mobile */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-[#4a4a4d] text-xs tracking-wide md:hidden"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <p>Scroll to begin</p>
      </motion.div>
    </div>
  );
}
