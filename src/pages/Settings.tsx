import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Bell, BellOff } from 'lucide-react';
import { createPageUrl } from '@/utils/urls';
import { clearAll } from '@/utils/storage';
import { readSettings, writeSettings } from '@/utils/storage';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { setAccessCode as apiSetAccessCode, getUserInfo } from '@/utils/api';
import { applyTheme } from '@/utils/theme';
import { 
  requestNotificationPermission, 
  checkNotificationPermission,
  getNotificationsEnabled,
  setNotificationsEnabled,
  showNotification
} from '@/utils/notifications';
import { isPremiumEnabled, getActivationCode, clearPremiumStates, migrateOldPremiumData } from '@/lib/premium';

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
  const [accessCode, setAccessCode] = useState('');
  const [accessCodeError, setAccessCodeError] = useState('');
  const [currentAccessCode, setCurrentAccessCode] = useState<string | null>(null);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
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
  const navigate = useNavigate();
  const { user, signOut } = useClerkAuth();

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
    // Fetch current user info including access code
    if (user) {
      getUserInfo()
        .then(info => {
          setCurrentAccessCode(info.accessCode || null);
        })
        .catch(console.error);
    }
  }, [user]);

  // Migrate old premium data when user changes
  useEffect(() => {
    if (user?.id) {
      migrateOldPremiumData(user.id);
    }
  }, [user?.id]);

  const validateAccessCode = (code: string): string | null => {
    if (!code) return null;
    if (code.length < 5) return 'Access code must be at least 5 characters';
    if (!/[a-zA-Z]/.test(code)) return 'Must include at least one letter';
    if (!/[0-9]/.test(code)) return 'Must include at least one number';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(code)) return 'Must include at least one special character';
    return null;
  };

  const handleAccessCodeChange = (value: string) => {
    setAccessCode(value);
    if (value) {
      const error = validateAccessCode(value);
      setAccessCodeError(error || '');
    } else {
      setAccessCodeError('');
    }
  };

  const handleSetAccessCode = async () => {
    if (!accessCode.trim()) {
      setSavedMsg('Please enter an access code');
      setTimeout(() => setSavedMsg(''), 2000);
      return;
    }

    const validationError = validateAccessCode(accessCode.trim());
    if (validationError) {
      setSavedMsg(validationError);
      setTimeout(() => setSavedMsg(''), 3000);
      return;
    }

    setIsLoadingCode(true);
    try {
      await apiSetAccessCode(accessCode.trim());
      setCurrentAccessCode(accessCode.trim());
      setSavedMsg('Access code saved! Use it to login on other devices.');

      setAccessCode('');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err: any) {
      setSavedMsg(err.message || 'Failed to set access code');
      setTimeout(() => setSavedMsg(''), 3000);
    } finally {
      setIsLoadingCode(false);
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
        if (resetStage === 1) setResetStage(0); // Reset if user doesn't confirm
      }, 3500);
      return;
    }
    
    if (resetStage === 1) {
      // Second click: show final confirmation
      setResetStage(2);
      setTimeout(() => {
        if (resetStage === 2) setResetStage(0);
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
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      navigate(createPageUrl('Access'));
                    }}
                    className="flex items-center gap-2 text-[#6a6a6d] hover:text-[#c4c4c6] text-sm transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </section>

              <section className="p-6 border border-[#1a1a1d] bg-[#0a0a0b]">
                <h2 className="text-[#c4c4c6] text-sm tracking-wide mb-3">Access Code</h2>
                {currentAccessCode ? (
                  <div className="space-y-3">
                    <p className="text-[#5a5a5d] text-sm">Current code: <span className="text-[#8a8a8d] font-mono">{currentAccessCode}</span></p>
                    <p className="text-[#4a4a4d] text-xs">Use this code to quickly login on other devices</p>
                    <div className="pt-2 border-t border-[#1a1a1d]">
                      <p className="text-[#4a4a4d] text-xs mb-2">Change access code:</p>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={accessCode}
                            onChange={(e) => handleAccessCodeChange(e.target.value)}
                            className={`flex-1 bg-[#0e0e10] border ${accessCodeError ? 'border-red-500' : 'border-[#1a1a1d]'} focus:border-[#2d4a3a] text-[#c4c4c6] px-4 py-2 text-sm tracking-wide outline-none transition-all duration-300 placeholder:text-[#3a3a3d]`}
                            placeholder="new-access-code"
                        />
                        <button
                          type="button"
                          onClick={handleSetAccessCode}
                          disabled={isLoadingCode}
                          className="px-4 py-2 bg-[#0e0e10] border border-[#1a1a1d] hover:border-[#2a2a2d] text-[#8a8a8d] hover:text-[#c4c4c6] text-sm tracking-wide transition-all duration-300 disabled:opacity-50"
                        >
                          {isLoadingCode ? 'Saving...' : 'Update'}
                        </button>
                        </div>
                        {accessCodeError ? (
                          <p className="text-red-400 text-xs">{accessCodeError}</p>
                        ) : (
                          <p className="text-[#3a3a3d] text-xs">Must include: letter, number, special character, 5+ chars</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[#4a4a4d] text-xs mb-3">Create an access code for quick login on other devices</p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={accessCode}
                          onChange={(e) => handleAccessCodeChange(e.target.value)}
                          className={`flex-1 bg-[#0e0e10] border ${accessCodeError ? 'border-red-500' : 'border-[#1a1a1d]'} focus:border-[#2d4a3a] text-[#c4c4c6] px-4 py-2 text-sm tracking-wide outline-none transition-all duration-300 placeholder:text-[#3a3a3d]`}
                          placeholder="e.g., Ali@2026"
                        />
                        <button
                          type="button"
                          onClick={handleSetAccessCode}
                          disabled={isLoadingCode}
                          className="px-4 py-2 bg-[#0e0e10] border border-[#1a1a1d] hover:border-[#2a2a2d] text-[#8a8a8d] hover:text-[#c4c4c6] text-sm tracking-wide transition-all duration-300 disabled:opacity-50"
                        >
                          {isLoadingCode ? 'Saving...' : 'Create'}
                        </button>
                      </div>
                      {accessCodeError ? (
                        <p className="text-red-400 text-xs">{accessCodeError}</p>
                      ) : (
                        <p className="text-[#3a3a3d] text-xs">Must include: letter, number, special character, 5+ chars</p>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {/* Premium Key Section */}
          {isPremiumEnabled(user?.id) && (
            <section className="p-6 border border-[#1a1a1d] bg-[#0a0a0b]">
              <h2 className="text-[#c4c4c6] text-sm tracking-wide mb-3">Premium Key</h2>
              <div className="space-y-3">
                <p className="text-[#4a4a4d] text-xs mb-3">Your activation code for backup reactivation</p>
                <button
                  onClick={() => setShowPremiumKey(!showPremiumKey)}
                  className="flex items-center gap-2 text-[#6a6a6d] hover:text-[#c4c4c6] text-sm transition-colors"
                >
                  <span className="w-4 h-4 border border-current rounded flex items-center justify-center text-xs">
                    {showPremiumKey ? '−' : '+'}
                  </span>
                  {showPremiumKey ? 'Hide Key' : 'Show Key'}
                </button>
                {showPremiumKey && getActivationCode(user?.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-[#0e0e10] border border-[#1a1a1d] p-3 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-2 py-1 bg-[#1a1a1d] text-[#3dd98f] font-mono text-sm rounded border border-[#2a2a2d]">
                        {getActivationCode(user?.id)}
                      </code>
                      <motion.button
                        onClick={async () => {
                          await navigator.clipboard.writeText(getActivationCode(user?.id)!);
                          setPremiumKeyCopyStatus('copied');
                          setTimeout(() => setPremiumKeyCopyStatus('idle'), 2000);
                        }}
                        className="px-3 py-1 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] text-sm rounded transition-colors min-w-[60px]"
                        animate={premiumKeyCopyStatus === 'copied' ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 0.2 }}
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
                      <button
                        onClick={() => {
                          clearPremiumStates(user?.id);
                          setSavedMsg('Premium data cleared for current user');
                          setTimeout(() => setSavedMsg(''), 3000);
                          // Refresh the page to update the UI
                          window.location.reload();
                        }}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                      >
                        Clear Premium Data
                      </button>
                    </div>
                  </motion.div>
                )}
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
                <button
                  key={opt.key}
                  onClick={() => handleThemeChange(opt.key)}
                  className={`px-4 py-3 border text-sm tracking-wide transition-all duration-300 ${
                    theme === opt.key ? 'border-[#2d4a3a] text-[#c4c4c6] bg-[#0e0e10]' : 'border-[#1a1a1d] text-[#8a8a8d] hover:border-[#2a2a2d]'
                  }`}
                >
                  {opt.label}
                </button>
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
                <button
                  type="button"
                  onClick={handleFocusPhraseSave}
                  className="px-3 py-2 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] font-semibold text-xs tracking-wide"
                >
                  Save
                </button>
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
                <button
                  type="button"
                  onClick={handleCustomCategoriesSave}
                  className="px-3 py-2 border border-[#2d4a3a] text-[#c4c4c6] hover:text-white text-xs tracking-wide"
                >
                  Save
                </button>
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
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setRemindersPerDay(num);
                          localStorage.setItem('mizan_reminders_per_day', num.toString());
                          setSavedMsg(`${num} reminder${num > 1 ? 's' : ''} per day set.`);
                          setTimeout(() => setSavedMsg(''), 2000);
                        }}
                        className={`flex-1 px-3 py-2 text-xs tracking-wide transition-all duration-300 ${
                          remindersPerDay === num
                            ? 'bg-[#2d4a3a] border-[#2d4a3a] text-[#0a0a0a] font-semibold'
                            : 'bg-[#0e0e10] border-[#1a1a1d] text-[#8a8a8d] hover:border-[#2a2a2d] hover:text-[#c4c4c6]'
                        } border`}
                      >
                        {num}x
                      </button>
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
                  transition={{ duration: 0.3 }}
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
