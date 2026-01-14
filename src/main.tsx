import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { ClerkAuthProvider } from './contexts/ClerkAuthContext';
import { ModProvider } from './contexts/ModContext';
import App from './App';
import './index.css';
import { readSettings } from './utils/storage';
import { applyTheme } from './utils/theme';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Apply saved theme before rendering to avoid flash
try {
  const savedTheme = readSettings().theme || 'dark';
  applyTheme(savedTheme);
} catch (err) {
  console.warn('Failed to apply saved theme, using default.', err);
}

// Error fallback component for missing Clerk key
const ClerkErrorFallback = () => (
  <div className="min-h-screen bg-[#0a0a0b] text-[#c4c4c6] flex items-center justify-center px-6">
    <div className="max-w-md w-full p-8 border border-red-900/50 bg-[#0e0e10] text-center">
      <div className="w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-light mb-2 text-red-400">Configuration Error</h2>
      <p className="text-sm text-[#8a8a8d] mb-4">
        Clerk authentication is not configured. Please add your Clerk publishable key to continue.
      </p>
      <div className="bg-[#1a1a1d] p-3 rounded text-left mb-4">
        <p className="text-xs text-[#6a6a6d] mb-2">Add to your .env file:</p>
        <code className="text-xs text-[#3dd98f] block">
          VITE_CLERK_PUBLISHABLE_KEY=pk_...
        </code>
      </div>
      <a 
        href="https://dashboard.clerk.com/last-active?path=api-keys"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-4 py-2 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] text-sm transition-colors"
      >
        Get Clerk API Key
      </a>
    </div>
  </div>
);

// Check if Clerk key exists before rendering
if (!clerkPubKey) {
  console.error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable');
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <ClerkErrorFallback />
    </React.StrictMode>
  );
} else {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={clerkPubKey}>
        <BrowserRouter>
          <ClerkAuthProvider>
            <ModProvider>
              <App />
            </ModProvider>
          </ClerkAuthProvider>
        </BrowserRouter>
      </ClerkProvider>
    </React.StrictMode>
  );
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed, app will still work
    });
  });
}
