import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { ClerkAuthProvider } from './contexts/ClerkAuthContext';
import App from './App';
import './index.css';
import { readSettings } from './utils/storage';
import { applyTheme } from './utils/theme';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  console.error('❌ VITE_CLERK_PUBLISHABLE_KEY is not set!');
  document.body.innerHTML = '<div style="color: red; padding: 20px; font-family: monospace;">Error: Clerk publishable key not found. Check environment variables.</div>';
  throw new Error('Clerk publishable key not configured');
}

console.log('✅ Clerk key found:', clerkPubKey ? 'Yes' : 'No');

// Apply saved theme before rendering to avoid flash
try {
  const savedTheme = readSettings().theme || 'dark';
  applyTheme(savedTheme);
} catch (err) {
  console.warn('Failed to apply saved theme, using default.', err);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}>
      <BrowserRouter>
        <ClerkAuthProvider>
          <App />
        </ClerkAuthProvider>
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed, app will still work
    });
  });
}
