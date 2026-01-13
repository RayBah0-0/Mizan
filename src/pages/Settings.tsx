import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Bell, BellOff } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import { createPageUrl } from '@/utils/urls';
import { clearAll, readUser, writeUser, updateLeaderboardUsername } from '@/utils/storage';
import { readSettings, writeSettings } from '@/utils/storage';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
// Backend API no longer used - premium is localStorage-based
import { applyTheme } from '@/utils/theme';
import { 
  requestNotificationPermission, 
  checkNotificationPermission,
  getNotificationsEnabled,
  setNotificationsEnabled,
  showNotification
} from '@/utils/notifications';

// Custom animated toggle switch
const AnimatedToggle = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
  <motion.button
    className={`relative w-12 h-6 rounded-full transition-colors ${
      checked ? 'bg-[#2d4a3a]' : 'bg-[#2a2a2d]'
    }`}
    onClick={() => onChange(!checked)}
  >
    <motion.div
      className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
      animate={{ x: checked ? 20 : 0 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 500, damping: 30 }}
    />
  </motion.button>
);

export default function Settings() {
  const [savedMsg, setSavedMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetStage, setResetStage] = useState(0); // 0: none, 1: confirm, 2: final
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [notificationTimes, setNotificationTimes] = useState<string[]>(['20:00', '14:00', '08:00']);
  const [notifyDailyCheckin, setNotifyDailyCheckin] = useState(true);
  const [notifyCycleEnd, setNotifyCycleEnd] = useState(true);
  const [remindersPerDay, setRemindersPerDay] = useState(1);
  const [theme, setTheme] = useState('dark');
  const [focusPhrase, setFocusPhrase] = useState('Consistency is earned.');
  const [customCategories, setCustomCategories] = useState('');
  const [featureFlags, setFeatureFlags] = useState({ prioritySupport: false, earlyAccess: false, supportChannel: 'discord' as 'discord' | 'email' | 'none' });
  const [showPremiumKey, setShowPremiumKey] = useState(false);
  const [premiumKeyCopyStatus, setPremiumKeyCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [quietMode, setQuietMode] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const navigate = useNavigate();
  const { user, signOut, premiumStatus: premium } = useClerkAuth();

  useEffect(() => {
    // Check notification status
    setNotificationsEnabledState(getNotificationsEnabled());
    setNotificationPermission(checkNotificationPermission());
    
    // Load notification preferences
    const savedTimes = localStorage.getItem('mizan_notification_times');
    const savedDailyCheckin = localStorage.getItem('mizan_notify_daily_checkin');
    const savedCycleEnd = localStorage.getItem('mizan_notify_cycle_end');
    const savedRemindersPerDay = localStorage.getItem('mizan_reminders_per_day');
    
    if (savedTimes) setNotificationTimes(JSON.parse(savedTimes));
    if (savedDailyCheckin !== null) setNotifyDailyCheckin(savedDailyCheckin === 'true');
    if (savedCycleEnd !== null) setNotifyCycleEnd(savedCycleEnd === 'true');
    if (savedRemindersPerDay) setRemindersPerDay(parseInt(savedRemindersPerDay));
    
    // Load Quiet Mode (premium feature)
    const savedQuietMode = localStorage.getItem('mizan_quiet_mode');
    if (savedQuietMode !== null) setQuietMode(savedQuietMode === 'true');
    
    // Load username from Clerk
    if (user?.username) {
      setUsername(user.username);
      // Also save to localStorage as cache for leaderboard
      writeUser(user.username);
    }
    
    // Load settings (theme, focus, feature flags)
    const s = readSettings();
    const nextTheme = s.theme || 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    setFocusPhrase(s.focusPhrase || 'Consistency is earned.');
    setCustomCategories((s.customCategories || []).join(', '));
    setFeatureFlags({
      prioritySupport: s.featureFlags?.prioritySupport ?? false,
      earlyAccess: s.featureFlags?.earlyAccess ?? false,
      supportChannel: s.featureFlags?.supportChannel || 'discord'
    });
  }, [user]);

  // Migrate old premium data when user changes
  useEffect(() => {
    if (user?.id) {
      migrateOldPremiumData(user.id);
    }
  }, [user?.id]);

  // Sync username from Clerk to leaderboard on every user change
  useEffect(() => {
    if (user?.username) {
      const storedUsername = readUser();
      // Always update if different
      if (storedUsername !== user.username) {
        console.log('Syncing username in Settings: ', storedUsername, ' -> ', user.username);
        if (storedUsername) {
          updateLeaderboardUsername(storedUsername, user.username);
        }
        writeUser(user.username);
      }
    }
  }, [user, user?.username]);

  const handleUsernameSave = async () => {
    const trimmed = username.trim();
    
    if (!trimmed) {
      setUsernameError('Username cannot be empty');
      return;
    }
    
    if (trimmed.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    
    if (trimmed.length > 20) {
      setUsernameError('Username must be less than 20 characters');
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      return;
    }
    
    try {
      // Check if username is already taken via Clerk
      const checkResponse = await fetch('/api/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: trimmed,
          currentUserId: user?.id 
        })
      });
      
      const checkData = await checkResponse.json();
      
      if (!checkData.available) {
        setUsernameError('Username is already taken. Please choose another.');
        return;
      }
      
      // Update Clerk username directly (not metadata)
      const { user: clerkUser } = await import('@clerk/clerk-react').then(m => ({ user: (window as any).Clerk?.user }));
      
      if (clerkUser) {
        await clerkUser.update({
          username: trimmed
        });
      }
      
      // Get old username before updating
      const oldUsername = user?.username || readUser();
      
      // Save to localStorage for leaderboard
      writeUser(trimmed);
      
      // Update username in leaderboard entries
      if (oldUsername && oldUsername !== trimmed) {
        updateLeaderboardUsername(oldUsername, trimmed);
      }
      
      setUsernameError('');
      setSavedMsg('Username updated successfully!');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (error: any) {
      console.error('Error saving username:', error);
      
      // Handle Clerk verification requirement
      if (error.message?.includes('additional verification') || error.status === 403) {
        setUsernameError('Username update requires verification. Please use the profile menu (top right) to update your username with password confirmation.');
      } else {
        setUsernameError(error.message || 'Failed to update username. Please try again.');
      }
    }
  };

  const handleNotificationToggle = async (checked: boolean) => {
    if (checked) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        setNotificationsEnabledState(true);
        setNotificationPermission('granted');
        setSavedMsg('Notifications enabled! You\'ll be reminded to complete your daily check-ins.');
      } else {
        setSavedMsg('Notification permission denied. Please enable in browser settings.');
        setNotificationsEnabledState(false);
      }
    } else {
      setNotificationsEnabled(false);
      setNotificationsEnabledState(false);
      setSavedMsg('Notifications disabled.');
    }
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const persistSettings = (next: Partial<ReturnType<typeof readSettings>>) => {
    const merged = {
      theme,
      focusPhrase,
      customCategories: customCategories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      featureFlags,
      ...next
    } as any;
    writeSettings(merged);
  };

  const handleThemeChange = (value: string) => {
    setTheme(value);
    applyTheme(value);
    persistSettings({ theme: value });
    setSavedMsg('Theme preference saved');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  const handleFocusPhraseSave = () => {
    persistSettings({ focusPhrase });
    setSavedMsg('Focus phrase saved');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  const handleCustomCategoriesSave = () => {
    persistSettings({ customCategories: customCategories.split(',').map((c) => c.trim()).filter(Boolean) });
    setSavedMsg('Custom categories saved');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  const updateFeatureFlags = (next: Partial<typeof featureFlags>) => {
    const merged = { ...featureFlags, ...next };
    setFeatureFlags(merged as any);
    persistSettings({ featureFlags: merged as any });
    setSavedMsg('Preferences saved');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  const handleReset = () => {
    if (resetStage === 0) {
      // First click: show confirmation
      setResetStage(1);
      setTimeout(() => {
        setResetStage((current) => current === 1 ? 0 : current); // Reset if user doesn't confirm
      }, 3500);
      return;
    }
    
    if (resetStage === 1) {
      // Second click: show final confirmation
      setResetStage(2);
      setTimeout(() => {
        setResetStage((current) => current === 2 ? 0 : current);
      }, 2500);
      return;
    }
    
    if (resetStage === 2) {
      // Final click: execute reset
      clearAll();
      setSavedMsg('Data cleared. Restarting...');
      setTimeout(() => navigate(createPageUrl('Landing')), 800);
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#c4c4c6] px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-light tracking-wide mb-2">Settings</h1>
          <p className="text-[#4a4a4d] text-sm ml-5">Adjust accountability rules and manage data.</p>
        </motion.div>

        <div className="space-y-8">
          {user && (
            <>
              <section className="p-6 border border-[#1a1a1d] bg-[#0a0a0b]">
                <h2 className="text-[#c4c4c6] text-sm tracking-wide mb-3">Account</h2>
                <div className="space-y-3">
                  <p className="text-[#5a5a5d] text-sm">Logged in as <span className="text-[#8a8a8d]">{user.email}</span></p>
                  <motion.button
                    type="button"
                    onClick={() => {
                      signOut();
                      navigate(createPageUrl('Access'));
                    }}
                    whileHover={{ scale: 1.05, color: '#ff6b6b' }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 text-[#6a6a6d] text-sm transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </motion.button>
                </div>
              </section>

              <section className="p-6 border border-[#1a1a1d] bg-[#0a0a0b]">
                <h2 className="text-[#c4c4c6] text-sm tracking-wide mb-3">Username</h2>
                <p className="text-[#4a4a4d] text-xs mb-3">
                  How you appear on the leaderboard. Usernames are permanent and cannot be changed.
                </p>
                <div className="space-y-2">
                  <div className="px-4 py-2 bg-[#0e0e10] border border-[#1a1a1d] text-[#8a8a8d] text-sm tracking-wide rounded">
                    {user?.username || 'Not set'}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Premium Key Section */}
          {premium.active && premium.activationCode && (
            <section className="p-6 border border-[#1a1a1d] bg-[#0a0a0b]">
              <h2 className="text-[#c4c4c6] text-sm tracking-wide mb-3">Premium Key</h2>
              <div className="space-y-3">
                <p className="text-[#4a4a4d] text-xs mb-3">Your activation code for backup reactivation</p>
                <motion.button
                  onClick={() => setShowPremiumKey(!showPremiumKey)}
                  whileHover={{ scale: 1.05, color: '#c4c4c6' }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 text-[#6a6a6d] text-sm transition-colors"
                >
                  <span className="w-4 h-4 border border-current rounded flex items-center justify-center text-xs">
                    {showPremiumKey ? '−' : '+'}
                  </span>
                  {showPremiumKey ? 'Hide Key' : 'Show Key'}
                </motion.button>
                {showPremiumKey && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-[#0e0e10] border border-[#1a1a1d] p-3 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-2 py-1 bg-[#1a1a1d] text-[#3dd98f] font-mono text-sm rounded border border-[#2a2a2d]">
                        {premium.activationCode}
                      </code>
                      <motion.button
                        onClick={async () => {
                          await navigator.clipboard.writeText(premium.activationCode!);
                          setPremiumKeyCopyStatus('copied');
                          setTimeout(() => setPremiumKeyCopyStatus('idle'), 2000);
                        }}
                        whileHover={{ scale: 1.05, backgroundColor: '#3d5a4a' }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1 bg-[#2d4a3a] text-[#0a0a0a] text-sm rounded transition-colors min-w-[60px]"
                        animate={premiumKeyCopyStatus === 'copied' ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        <motion.span
                          key={premiumKeyCopyStatus}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                        >
                          {premiumKeyCopyStatus === 'copied' ? 'Copied!' : 'Copy'}
                        </motion.span>
                      </motion.button>
                    </div>
                    <p className="text-[#4a4a4d] text-xs mt-2">Use this code to reactivate premium on another device or after data reset.</p>
                    <div className="mt-3 pt-3 border-t border-[#1a1a1d]">
                      <motion.button
                        onClick={() => {
                          clearPremiumData(user?.id);
                          setSavedMsg('Premium data cleared for current user');
                          setTimeout(() => setSavedMsg(''), 3000);
                          // Refresh the page to update the UI
                          window.location.reload();
                        }}
                        whileHover={{ scale: 1.05, backgroundColor: '#dc2626' }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded transition-colors"
                      >
                        Clear Premium Data
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </div>
            </section>
          )}

          {/* Quiet Mode - Premium Feature */}
          {premium.active && (
            <section className="p-6 border border-[#1a1a1d] bg-[#0a0a0b]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-[#c4c4c6] text-sm tracking-wide">Quiet Mode</h2>
                  <p className="text-[#4a4a4d] text-xs mt-1">Hide streaks, points, and ranks. Focus on intention only.</p>
                </div>
                <AnimatedToggle
                  checked={quietMode}
                  onChange={(val) => {
                    setQuietMode(val);
                    localStorage.setItem('mizan_quiet_mode', val.toString());
                    setSavedMsg(val ? 'Quiet Mode enabled' : 'Quiet Mode disabled');
                    setTimeout(() => setSavedMsg(''), 2000);
                  }}
                />
              </div>
            </section>
          )}

          {/* Themes & personalization */}
          <section className="p-6 border border-[#1a1a1d] bg-[#0a0a0b] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[#c4c4c6] text-sm tracking-wide">Themes</h2>
              <span className="text-[#4a4a4d] text-xs">Blue, Pink, Dark, White, Red</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'blue', label: 'Blue' },
                { key: 'pink', label: 'Pink' },
                { key: 'dark', label: 'Green' },
                { key: 'default', label: 'Default' },
                { key: 'red', label: 'Red' }
              ].map((opt) => (
                <motion.button
                  key={opt.key}
                  onClick={() => handleThemeChange(opt.key)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`px-4 py-3 border text-sm tracking-wide transition-all duration-300 ${
                    theme === opt.key ? 'border-[#2d4a3a] text-[#c4c4c6] bg-[#0e0e10]' : 'border-[#1a1a1d] text-[#8a8a8d] hover:border-[#2a2a2d]'
                  }`}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-[#8a8a8d] text-xs tracking-wide">Custom focus phrase</label>
              <div className="flex gap-2">
                <input
                  value={focusPhrase}
                  onChange={(e) => setFocusPhrase(e.target.value)}
                  className="flex-1 bg-[#0e0e10] border border-[#1a1a1d] focus:border-[#2d4a3a] text-[#c4c4c6] px-4 py-2 text-sm tracking-wide outline-none transition-all duration-300"
                  placeholder="Consistency is earned."
                />
                <motion.button
                  type="button"
                  onClick={handleFocusPhraseSave}
                  whileHover={{ scale: 1.05, backgroundColor: '#3d5a4a' }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="px-3 py-2 bg-[#2d4a3a] text-[#0a0a0a] font-semibold text-xs tracking-wide"
                >
                  Save
                </motion.button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[#8a8a8d] text-xs tracking-wide">Custom categories (comma separated)</label>
              <div className="flex gap-2">
                <input
                  value={customCategories}
                  onChange={(e) => setCustomCategories(e.target.value)}
                  className="flex-1 bg-[#0e0e10] border border-[#1a1a1d] focus:border-[#2d4a3a] text-[#c4c4c6] px-4 py-2 text-sm tracking-wide outline-none transition-all duration-300"
                  placeholder="focus, calm, gratitude"
                />
                <motion.button
                  type="button"
                  onClick={handleCustomCategoriesSave}
                  whileHover={{ scale: 1.05, color: '#ffffff' }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="px-3 py-2 border border-[#2d4a3a] text-[#c4c4c6] text-xs tracking-wide"
                >
                  Save
                </motion.button>
              </div>
              <p className="text-[#4a4a4d] text-xs">Stored in your settings; wire into check-ins later.</p>
            </div>
          </section>

          {/* Notifications Section */}          <section className="p-6 border border-[#1a1a1d] bg-[#0a0a0b] space-y-4">
            <h2 className="text-[#c4c4c6] text-sm tracking-wide mb-3">Notifications</h2>
            
            <label className="flex items-center gap-3 text-[#c4c4c6] text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => handleNotificationToggle(e.target.checked)}
                className="w-4 h-4 bg-[#0e0e10] border border-[#1a1a1d] accent-[#2d4a3a]"
              />
              <div className="flex items-center gap-2">
                {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                Enable notifications
              </div>
            </label>
            
            {notificationPermission === 'denied' && (
              <p className="text-red-400 text-xs">Notifications blocked. Enable in browser settings.</p>
            )}

            {notificationsEnabled && notificationPermission === 'granted' && (
              <div className="pl-7 space-y-4 pt-2 border-t border-[#1a1a1d] mt-4">
                <div className="space-y-2">
                  <label className="text-[#8a8a8d] text-xs tracking-wide">Daily reminders</label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((num) => (
                      <motion.button
                        key={num}
                        type="button"
                        onClick={() => {
                          setRemindersPerDay(num);
                          localStorage.setItem('mizan_reminders_per_day', num.toString());
                          setSavedMsg(`${num} reminder${num > 1 ? 's' : ''} per day set.`);
                          setTimeout(() => setSavedMsg(''), 2000);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`flex-1 px-3 py-2 text-xs tracking-wide transition-all duration-300 ${
                          remindersPerDay === num
                            ? 'bg-[#2d4a3a] border-[#2d4a3a] text-[#0a0a0a] font-semibold'
                            : 'bg-[#0e0e10] border-[#1a1a1d] text-[#8a8a8d] hover:border-[#2a2a2d] hover:text-[#c4c4c6]'
                        } border`}
                      >
                        {num}x
                      </motion.button>
                    ))}
                  </div>
                  <p className="text-[#4a4a4d] text-xs">Number of reminders per day</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[#8a8a8d] text-xs tracking-wide">Reminder times</label>
                  {Array.from({ length: remindersPerDay }).map((_, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-[#6a6a6d] text-xs w-16">{index === 0 ? 'First' : index === 1 ? 'Second' : 'Third'}:</span>
                      <input
                        type="time"
                        value={notificationTimes[index] || '20:00'}
                        onChange={(e) => {
                          const newTimes = [...notificationTimes];
                          newTimes[index] = e.target.value;
                          setNotificationTimes(newTimes);
                          localStorage.setItem('mizan_notification_times', JSON.stringify(newTimes));
                          setSavedMsg('Reminder times updated.');
                          setTimeout(() => setSavedMsg(''), 2000);
                        }}
                        className="flex-1 bg-[#0e0e10] border border-[#1a1a1d] focus:border-[#2d4a3a] text-[#c4c4c6] px-3 py-2 text-sm tracking-wide outline-none transition-all duration-300"
                      />
                    </div>
                  ))}
                  <p className="text-[#4a4a4d] text-xs">Set specific times for each reminder</p>
                </div>

                <div className="space-y-2">
                  <p className="text-[#8a8a8d] text-xs tracking-wide mb-2">Notify me about:</p>
                  
                  <label className="flex items-center gap-3 text-[#c4c4c6] text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={notifyDailyCheckin}
                      onChange={(e) => {
                        setNotifyDailyCheckin(e.target.checked);
                        localStorage.setItem('mizan_notify_daily_checkin', e.target.checked.toString());
                        setSavedMsg('Preference saved.');
                        setTimeout(() => setSavedMsg(''), 2000);
                      }}
                      className="w-4 h-4 bg-[#0e0e10] border border-[#1a1a1d] accent-[#2d4a3a]"
                    />
                    Daily check-in reminders
                  </label>

                  <label className="flex items-center gap-3 text-[#c4c4c6] text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={notifyCycleEnd}
                      onChange={(e) => {
                        setNotifyCycleEnd(e.target.checked);
                        localStorage.setItem('mizan_notify_cycle_end', e.target.checked.toString());
                        setSavedMsg('Preference saved.');
                        setTimeout(() => setSavedMsg(''), 2000);
                      }}
                      className="w-4 h-4 bg-[#0e0e10] border border-[#1a1a1d] accent-[#2d4a3a]"
                    />
                    Cycle completion reminders
                  </label>
                </div>
              </div>
            )}
          </section>
          <section className="p-6 border border-[#1a1a1d] bg-[#0a0a0b]">
            <h2 className="text-[#c4c4c6] text-sm tracking-wide mb-3">Reset data</h2>
            <p className="text-[#4a4a4d] text-sm mb-4">Clears all check-ins, cycles, and settings. This returns you to Ghāfil.</p>
            
            <AnimatePresence mode="wait">
              {resetStage === 0 && (
                <motion.button
                  key="reset-stage-0"
                  type="button"
                  onClick={handleReset}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ scale: 1.02, backgroundColor: '#8a2a2d', borderColor: '#b43a3d' }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="w-full py-3 border border-[#2a2a2d] text-[#6a6a6d] hover:text-[#c4c4c6] bg-[#0a0a0b] text-sm tracking-[0.15em] uppercase transition-all duration-300 hover:border-[#3a3a3d]"
                >
                  Reset everything
                </motion.button>
              )}

              {resetStage === 1 && (
                <motion.div
                  key="reset-stage-1"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  <p className="text-yellow-500/70 text-xs tracking-wide">Are you sure? This will erase everything.</p>
                  <motion.button
                    type="button"
                    onClick={handleReset}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 border border-yellow-600/50 text-yellow-600/70 hover:text-yellow-500 bg-[#0a0a0b] text-sm tracking-[0.15em] uppercase transition-all duration-300"
                  >
                    I'm sure
                  </motion.button>
                </motion.div>
              )}

              {resetStage === 2 && (
                <motion.div
                  key="reset-stage-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  <p className="text-red-500/70 text-xs tracking-wide font-medium">This cannot be undone.</p>
                  <motion.button
                    type="button"
                    onClick={handleReset}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 border border-red-600/60 text-red-500/80 hover:text-red-400 bg-[#0a0a0b] text-sm tracking-[0.15em] uppercase transition-all duration-300"
                  >
                    Delete everything
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <AnimatePresence>
            {savedMsg && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`text-sm ${resetStage > 0 ? 'text-yellow-500/70' : 'text-[#4a7a5a]'}`}
              >
                {savedMsg}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
