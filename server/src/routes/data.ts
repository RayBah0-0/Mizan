import { Router, Request, Response } from 'express';
import { getDB, run } from '../database.js';
import { authMiddleware } from '../auth.js';

type SummaryRange = '7d' | '14d' | '30d';

const DEFAULT_FEATURE_FLAGS = {
  premiumV2: false,
  mizanStrictMode: false
};

const CATEGORY_WEIGHTS: Record<string, number> = {
  prayer: 40,
  quran: 20,
  fasting: 20,
  charity: 10,
  reflection: 10
};

const RAMADAN_RANGES: Array<{ start: string; end: string }> = [
  { start: '2024-03-10', end: '2024-04-09' },
  { start: '2025-02-28', end: '2025-03-30' },
  { start: '2026-02-17', end: '2026-03-19' }
];

const FRIDAY_MULTIPLIER = 1.1;
const RAMADAN_MULTIPLIER = 1.15;
const EDIT_WINDOW_MINUTES = 60;
const STRICTNESS_MIN = 1;
const STRICTNESS_MAX = 5;

function parseSettings(row: any) {
  if (!row) return { settings: { requireThreeOfFive: true }, schemaVersion: 1, featureFlags: { ...DEFAULT_FEATURE_FLAGS } };

  const settingsJson = row.settings_json || row.settings;
  let parsed: any = { requireThreeOfFive: true };
  try {
    parsed = settingsJson ? JSON.parse(settingsJson as string) : { requireThreeOfFive: true };
  } catch (err) {
    parsed = { requireThreeOfFive: true };
  }

  const featureFlags = parsed.featureFlags || { ...DEFAULT_FEATURE_FLAGS };
  const schemaVersion = row.schema_version ? Number(row.schema_version) : 1;

  return { settings: parsed, schemaVersion, featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...featureFlags } };
}

function isRamadan(dateIso: string) {
  const date = dateIso.split('T')[0];
  return RAMADAN_RANGES.some(range => date >= range.start && date <= range.end);
}

function isFriday(dateIso: string) {
  const d = new Date(dateIso);
  return d.getUTCDay() === 5;
}

function computeScore(payload: Record<string, any>, dateIso: string) {
  let score = 0;
  Object.entries(CATEGORY_WEIGHTS).forEach(([key, weight]) => {
    if (payload?.[key]) {
      score += weight;
    }
  });

  if (isFriday(dateIso)) {
    score *= FRIDAY_MULTIPLIER;
  }

  if (isRamadan(dateIso)) {
    score *= RAMADAN_MULTIPLIER;
  }

  return Math.round(score);
}

function computeMaxScore(dateIso: string) {
  const fullPayload: Record<string, any> = {};
  Object.keys(CATEGORY_WEIGHTS).forEach((key) => {
    fullPayload[key] = true;
  });
  return computeScore(fullPayload, dateIso);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

function paywallReason(isPremium: boolean, feature: string) {
  if (isPremium) return null;
  return { code: 'premium_required', feature };
}

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

async function getUserById(userId: number) {
  const db = getDB();
  const result = await db.execute({
    sql: `SELECT id, username, subscription_tier, subscription_ends_at, premium_until, schema_version,
                 pledge_accepted_at, premium_started_at, commitment_ends_at
          FROM users WHERE id = ?`,
    args: [userId]
  });

  return result.rows[0];
}

// Get all user data (checkins, cycles, settings)
router.get('/sync', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const db = getDB();

    const checkinsResult = await db.execute({
      sql: 'SELECT date, categories, penalties, completed FROM checkins WHERE user_id = ? ORDER BY date',
      args: [userId]
    });

    const cyclesResult = await db.execute({
      sql: 'SELECT cycle_number, days, completed FROM cycles WHERE user_id = ? ORDER BY cycle_number',
      args: [userId]
    });

    const settingsResult = await db.execute({
      sql: 'SELECT settings FROM settings WHERE user_id = ?',
      args: [userId]
    });

    const checkins = checkinsResult.rows.map((row: any) => ({
      date: row.date,
      categories: JSON.parse(row.categories),
      penalties: row.penalties,
      completed: Boolean(row.completed)
    }));

    const cycles = cyclesResult.rows.map((row: any) => ({
      cycleNumber: row.cycle_number,
      days: JSON.parse(row.days),
      completed: Boolean(row.completed)
    }));

    const settings = settingsResult.rows.length > 0
      ? JSON.parse(settingsResult.rows[0].settings as string)
      : { requireThreeOfFive: true };

    res.json({ checkins, cycles, settings });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

// Save checkin
router.post('/checkins', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { date, categories, penalties, completed } = req.body;

    const db = getDB();
    
    // Check if exists
    const existing = await db.execute({ sql: 'SELECT id FROM checkins WHERE user_id = ? AND date = ?', args: [userId, date] });
    
    if (existing.rows.length > 0) {
      // Update
      await run(
        `UPDATE checkins SET categories = ?, penalties = ?, completed = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = ? AND date = ?`,
        [JSON.stringify(categories), penalties, completed ? 1 : 0, userId, date]
      );
    } else {
      // Insert
      await run(
        `INSERT INTO checkins (user_id, date, categories, penalties, completed, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, date, JSON.stringify(categories), penalties, completed ? 1 : 0]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Checkin save error:', error);
    res.status(500).json({ error: 'Failed to save checkin' });
  }
});

// Save cycle
router.post('/cycles', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { cycleNumber, days, completed } = req.body;

    const db = getDB();
    
    // Check if exists
    const existing = await db.execute({ sql: 'SELECT id FROM cycles WHERE user_id = ? AND cycle_number = ?', args: [userId, cycleNumber] });
    
    if (existing.rows.length > 0) {
      // Update
      await run(
        `UPDATE cycles SET days = ?, completed = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = ? AND cycle_number = ?`,
        [JSON.stringify(days), completed ? 1 : 0, userId, cycleNumber]
      );
    } else {
      // Insert
      await run(
        `INSERT INTO cycles (user_id, cycle_number, days, completed, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, cycleNumber, JSON.stringify(days), completed ? 1 : 0]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Cycle save error:', error);
    res.status(500).json({ error: 'Failed to save cycle' });
  }
});

// Save settings with schemaVersion + feature flags
router.post('/settings', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { settings, schemaVersion = 1 } = req.body;

    const db = getDB();
    const mergedSettings = { ...(settings || {}) };
    if (typeof mergedSettings.strictnessLevel === 'number') {
      const clamped = Math.max(STRICTNESS_MIN, Math.min(STRICTNESS_MAX, mergedSettings.strictnessLevel));
      mergedSettings.strictnessLevel = clamped;
    }

    const payload = JSON.stringify(mergedSettings);

    // Check if exists
    const existing = await db.execute({ sql: 'SELECT id FROM settings WHERE user_id = ?', args: [userId] });
    
    if (existing.rows.length > 0) {
      // Update
      await run(
        `UPDATE settings SET settings = ?, settings_json = ?, schema_version = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        [payload, payload, schemaVersion, userId]
      );
    } else {
      // Insert
      await run(
        `INSERT INTO settings (user_id, settings, settings_json, schema_version, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, payload, payload, schemaVersion]
      );
    }

    res.json({ success: true, schemaVersion });
  } catch (error) {
    console.error('Settings save error:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Lightweight profile + flags endpoint
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const db = getDB();

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settingsResult = await db.execute({ sql: 'SELECT settings, settings_json, schema_version FROM settings WHERE user_id = ?', args: [userId] });
    const { settings, schemaVersion, featureFlags } = parseSettings(settingsResult.rows[0]);

    const isPremium = Boolean(
      (user.subscription_tier === 'premium' && (!user.subscription_ends_at || new Date(user.subscription_ends_at as string) > new Date())) ||
      (user.premium_until && new Date(user.premium_until as string) > new Date())
    );

    res.json({
      id: user.id,
      username: user.username,
      subscription: {
        tier: user.subscription_tier || 'free',
        subscriptionEndsAt: user.subscription_ends_at || user.premium_until || null
      },
      pledgeAcceptedAt: user.pledge_accepted_at || null,
      premiumStartedAt: user.premium_started_at || null,
      commitmentEndsAt: user.commitment_ends_at || null,
      schemaVersion: user.schema_version || schemaVersion,
      settings,
      featureFlags,
      paywallReason: paywallReason(isPremium, 'premium_v2')
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// Daily entry with sealing/edit window enforcement
router.post('/daily-entry', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { date, payload, sealed } = req.body as { date: string; payload: Record<string, any>; sealed?: boolean };

    if (!date || !payload) {
      return res.status(400).json({ error: 'date and payload are required' });
    }

    const db = getDB();
    const existing = await db.execute({
      sql: 'SELECT id, sealed_at, locked_at FROM daily_entries WHERE user_id = ? AND date = ?',
      args: [userId, date]
    });

    const now = new Date();
    const current = existing.rows[0];

    if (current?.locked_at && new Date(current.locked_at as string) < now) {
      return res.status(409).json({ error: 'Entry is locked and cannot be edited' });
    }

    const sealedAt = sealed ? now.toISOString() : current?.sealed_at || null;
    const lockedAt = sealed
      ? addMinutes(now, EDIT_WINDOW_MINUTES).toISOString()
      : current?.locked_at || null;

    if (current) {
      await run(
        `UPDATE daily_entries
         SET payload_json = ?, sealed_at = ?, locked_at = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND date = ?`,
        [JSON.stringify(payload), sealedAt, lockedAt, userId, date]
      );
    } else {
      await run(
        `INSERT INTO daily_entries (user_id, date, payload_json, sealed_at, locked_at, edit_window_minutes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, date, JSON.stringify(payload), sealedAt, lockedAt, EDIT_WINDOW_MINUTES]
      );
    }

    res.json({
      success: true,
      sealedAt,
      lockedAt,
      editWindowMinutes: EDIT_WINDOW_MINUTES
    });
  } catch (error) {
    console.error('Daily entry error:', error);
    res.status(500).json({ error: 'Failed to save daily entry' });
  }
});

// Accept pledge commitment
router.post('/pledge/accept', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const acceptedAt = new Date().toISOString();
    await run('UPDATE users SET pledge_accepted_at = ? WHERE id = ?', [acceptedAt, userId]);
    res.json({ success: true, pledgeAcceptedAt: acceptedAt });
  } catch (error) {
    console.error('Pledge accept error:', error);
    res.status(500).json({ error: 'Failed to accept pledge' });
  }
});

// Summary endpoint with weights and paywall hook
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const range = (req.query.range as SummaryRange) || '14d';
    const db = getDB();

    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isPremium = Boolean(
      (user.subscription_tier === 'premium' && (!user.subscription_ends_at || new Date(user.subscription_ends_at as string) > new Date())) ||
      (user.premium_until && new Date(user.premium_until as string) > new Date())
    );

    const days = range === '30d' ? 30 : range === '7d' ? 7 : 14;
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    const startIso = start.toISOString().split('T')[0];

    const entries = await db.execute({
      sql: 'SELECT date, payload_json FROM daily_entries WHERE user_id = ? AND date >= ? ORDER BY date',
      args: [userId, startIso]
    });

    let totalScore = 0;
    const perDay: Array<{ date: string; score: number }> = [];

    entries.rows.forEach(row => {
      const payload = JSON.parse(row.payload_json as string);
      const score = computeScore(payload, row.date as string);
      totalScore += score;
      perDay.push({ date: row.date as string, score });
    });

    const average = perDay.length ? Math.round(totalScore / perDay.length) : 0;

    res.json({
      range,
      daysEvaluated: perDay.length,
      totalScore,
      averageScore: average,
      perDay,
      paywallReason: paywallReason(isPremium, 'premium_summary')
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

// Loss endpoint (server-side only)
router.get('/loss', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const db = getDB();
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isPremium = Boolean(
      (user.subscription_tier === 'premium' && (!user.subscription_ends_at || new Date(user.subscription_ends_at as string) > new Date())) ||
      (user.premium_until && new Date(user.premium_until as string) > new Date())
    );

    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 29);
    const startIso = start.toISOString().split('T')[0];

    const entries = await db.execute({
      sql: 'SELECT date, payload_json, sealed_at FROM daily_entries WHERE user_id = ? AND date >= ? ORDER BY date',
      args: [userId, startIso]
    });

    const today = new Date();
    const daysEvaluated = 30;
    const missingDays: string[] = [];
    const details: Array<{ date: string; score: number; deficit: number; sealed: boolean }> = [];
    let sealedEntries = 0;
    let unsealedEntries = 0;
    let totalScore = 0;
    let totalDeficit = 0;

    for (let i = 0; i < daysEvaluated; i += 1) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const row = entries.rows.find((r) => r.date === dateKey);
      if (!row) {
        missingDays.push(dateKey);
        continue;
      }

      const payload = JSON.parse(row.payload_json as string);
      const score = computeScore(payload, dateKey);
      const maxScore = computeMaxScore(dateKey);
      const deficit = Math.max(0, maxScore - score);
      const sealed = Boolean(row.sealed_at);
      if (sealed) sealedEntries += 1; else unsealedEntries += 1;
      totalScore += score;
      totalDeficit += deficit;
      details.push({ date: dateKey, score, deficit, sealed });
    }

    const responseBody: any = {
      window: '30d',
      daysEvaluated,
      sealedEntries,
      unsealedEntries,
      missingDays: missingDays.length,
      paywallReason: paywallReason(isPremium, 'premium_loss'),
    };

    if (isPremium) {
      responseBody.totalScore = totalScore;
      responseBody.totalDeficit = Math.round(totalDeficit);
      responseBody.averageScore = details.length ? Math.round(totalScore / details.length) : 0;
      responseBody.details = details.reverse();
    }

    res.json(responseBody);
  } catch (error) {
    console.error('Loss endpoint error:', error);
    res.status(500).json({ error: 'Failed to load loss data' });
  }
});

// Monthly report endpoint (locked for non-premium)
router.get('/report/monthly', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const monthParam = (req.query.month as string) || new Date().toISOString().slice(0, 7); // YYYY-MM
    const db = getDB();

    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isPremium = Boolean(
      (user.subscription_tier === 'premium' && (!user.subscription_ends_at || new Date(user.subscription_ends_at as string) > new Date())) ||
      (user.premium_until && new Date(user.premium_until as string) > new Date())
    );

    const existing = await db.execute({
      sql: 'SELECT content_json, locked FROM reports WHERE user_id = ? AND month = ?',
      args: [userId, monthParam]
    });

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      return res.json({
        month: monthParam,
        locked: Boolean(row.locked),
        content: JSON.parse(row.content_json as string),
        paywallReason: paywallReason(isPremium, 'premium_report')
      });
    }

    // Build a lightweight report snapshot on demand
    const summaryResult = await db.execute({
      sql: `SELECT date, payload_json FROM daily_entries
            WHERE user_id = ? AND date LIKE ? || '%' ORDER BY date`,
      args: [userId, monthParam]
    });

    const content = summaryResult.rows.map(row => ({ date: row.date, payload: JSON.parse(row.payload_json as string) }));
    const locked = isPremium ? 0 : 1;

    await run(
      'INSERT OR IGNORE INTO reports (user_id, month, content_json, locked) VALUES (?, ?, ?, ?)',
      [userId, monthParam, JSON.stringify(content), locked]
    );

    res.json({
      month: monthParam,
      locked: Boolean(locked),
      content: isPremium ? content : [],
      paywallReason: paywallReason(isPremium, 'premium_report')
    });
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({ error: 'Failed to load report' });
  }
});

// Store activation code
router.post('/activation-code', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { code, plan, expiresAt } = req.body;

  if (!code || !plan) {
    return res.status(400).json({ error: 'Code and plan are required' });
  }

  try {
    const db = getDB();
    await db.execute({
      sql: 'INSERT OR REPLACE INTO activation_codes (code, clerk_user_id, plan, expires_at) VALUES (?, ?, ?, ?)',
      args: [code, userId, plan, expiresAt]
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error storing activation code:', error);
    res.status(500).json({ error: 'Failed to store activation code' });
  }
});

// Validate activation code
router.post('/validate-code', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    // Check for preset codes
    const validPresetCodes = ['PREMIUM2025', 'LIFETIME2025'];
    if (validPresetCodes.includes(code.toUpperCase().trim())) {
      return res.json({ 
        valid: true, 
        plan: 'monthly',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Check database for user's activation code
    const db = getDB();
    const result = await db.execute({
      sql: 'SELECT plan, expires_at FROM activation_codes WHERE code = ? AND clerk_user_id = ?',
      args: [code.toUpperCase().trim(), userId]
    });

    if (result.rows.length > 0) {
      const row = result.rows[0] as any;
      res.json({ 
        valid: true, 
        plan: row.plan,
        expiresAt: row.expires_at 
      });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    console.error('Error validating code:', error);
    res.status(500).json({ error: 'Failed to validate code' });
  }
});

// Get premium status from database
router.get('/premium-status', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    const db = getDB();
    const result = await db.execute({
      sql: 'SELECT premium_until FROM users WHERE clerk_id = ?',
      args: [userId]
    });

    if (result.rows.length > 0) {
      const row = result.rows[0] as any;
      const premiumUntil = row.premium_until;
      
      if (premiumUntil) {
        const expiryDate = new Date(premiumUntil);
        const now = new Date();
        const active = expiryDate > now || premiumUntil === 'lifetime';
        
        res.json({
          active,
          expiresAt: premiumUntil === 'lifetime' ? null : premiumUntil
        });
      } else {
        res.json({ active: false, expiresAt: null });
      }
    } else {
      // User doesn't exist in DB yet, create entry
      await db.execute({
        sql: 'INSERT INTO users (clerk_id, username, created_at) VALUES (?, ?, ?)',
        args: [userId, userId, new Date().toISOString()]
      });
      res.json({ active: false, expiresAt: null });
    }
  } catch (error) {
    console.error('Error getting premium status:', error);
    res.status(500).json({ error: 'Failed to get premium status' });
  }
});

// Set premium status in database
router.post('/set-premium', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { plan, expiresAt } = req.body;

  if (!plan) {
    return res.status(400).json({ error: 'Plan is required' });
  }

  try {
    const db = getDB();
    
    // Ensure user exists
    const userCheck = await db.execute({
      sql: 'SELECT id FROM users WHERE clerk_id = ?',
      args: [userId]
    });

    if (userCheck.rows.length === 0) {
      // Create user if doesn't exist
      await db.execute({
        sql: 'INSERT INTO users (clerk_id, username, created_at) VALUES (?, ?, ?)',
        args: [userId, userId, new Date().toISOString()]
      });
    }

    // Update premium status
    const premiumUntil = plan === 'lifetime' ? 'lifetime' : expiresAt;
    await db.execute({
      sql: 'UPDATE users SET premium_until = ?, premium_started_at = ? WHERE clerk_id = ?',
      args: [premiumUntil, new Date().toISOString(), userId]
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting premium:', error);
    res.status(500).json({ error: 'Failed to set premium' });
  }
});

export default router;
