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

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed, app will still work
    });
  });
}
