import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import CheckIn from './pages/CheckIn';
import Status from './pages/Status';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import Pricing from './pages/Pricing';
import ActivatePremium from './pages/ActivatePremium';
import ThankYou from './pages/ThankYou';
import RedeemPremium from './pages/RedeemPremium';
import UserNotRegisteredError from './components/UserNotRegisteredError';
import { useClerkAuth } from './contexts/ClerkAuthContext';
import { syncFromServer, readCheckins } from './utils/storage';
import { 
  getNotificationsEnabled, 
  showNotification 
} from './utils/notifications';

export default function App() {
  const { user } = useClerkAuth();

  useEffect(() => {
    // Sync data from server on app load if authenticated
    if (user) {
      syncFromServer().catch(console.error);

      // Check if we should show a reminder notification
      if (getNotificationsEnabled()) {
        const checkins = readCheckins();
        const checkinsArray = Array.isArray(checkins) ? checkins : [];
        const today = new Date().toDateString();
        const todayCheckin = checkinsArray.find(c => new Date(c.date).toDateString() === today);
        
        if (!todayCheckin) {
          // Show reminder after 5 seconds if not checked in today
          const timer = setTimeout(() => {
            showNotification('Mizan Reminder', {
              body: 'Don\'t forget to complete your daily check-in!',
              tag: 'daily-reminder',
              requireInteraction: false
            });
          }, 5000);

          return () => clearTimeout(timer);
        }
      }
    }
  }, [user]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/status" element={<Status />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/activate" element={<ActivatePremium />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/getpremium-:token" element={<RedeemPremium />} />
        <Route path="/unauthorized" element={<UserNotRegisteredError />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
