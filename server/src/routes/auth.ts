import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { getDB, run } from '../database.js';
import { hashPassword, comparePassword, generateToken, authMiddleware } from '../auth.js';

const router = Router();

function generatePremiumToken(): string {
  return randomBytes(16).toString('hex');
}

function oneYearFromNow(): string {
  const now = new Date();
  return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();
}

function validateAccessCode(code: string): { valid: boolean; error?: string } {
  if (code.length < 5) {
    return { valid: false, error: 'Access code must be at least 5 characters' };
  }
  if (!/[a-zA-Z]/.test(code)) {
    return { valid: false, error: 'Access code must include at least one letter' };
  }
  if (!/[0-9]/.test(code)) {
    return { valid: false, error: 'Access code must include at least one number' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(code)) {
    return { valid: false, error: 'Access code must include at least one special character (!@#$%^&*...)' };
  }
  return { valid: true };
}

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, accessCode } = req.body;

    console.log('Registration attempt:', { username, hasPassword: !!password, accessCode });

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDB();
    
    // Check if username exists (use prepared statement)
    const existing = db.prepare(`SELECT id FROM users WHERE username = ?`).get([username]);
    if (existing) {
      return res.status(409).json({ error: 'This username is already taken. Please choose another.' });
    }

    // Check if access code exists (if provided)
    if (accessCode) {
      const validation = validateAccessCode(accessCode);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      
      const codeExists = db.prepare(`SELECT id FROM users WHERE access_code = ?`).get([accessCode]);
      if (codeExists) {
        return res.status(409).json({ error: 'This access code is already in use. Please create a different one.' });
      }
    }

    const passwordHash = await hashPassword(password);

    run(
      'INSERT INTO users (username, password_hash, access_code) VALUES (?, ?, ?)',
      [username, passwordHash, accessCode || null]
    );

    const result = db.exec('SELECT last_insert_rowid() as id');
    const userId = result[0].values[0][0] as number;
    const token = generateToken(userId);

    console.log('Registration successful! User ID:', userId);

    // Initialize default settings
    run(
      'INSERT INTO settings (user_id, settings) VALUES (?, ?)',
      [userId, JSON.stringify({ requireThreeOfFive: true })]
    );

    res.status(201).json({
      token,
      user: { id: userId, username },
      subscription: {
        tier: 'free',
        trialEndsAt: null,
        subscriptionEndsAt: null
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login with username/password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    console.log('Login attempt:', { username });

    if (!username || !password) {
      return res.status(400).json({ error: 'Please enter both username and password.' });
    }

    const db = getDB();
    const user = db.prepare(`SELECT id, username, password_hash, subscription_tier, trial_ends_at, subscription_ends_at FROM users WHERE username = ?`).get([username]) as any;

    if (!user) {
      return res.status(401).json({ error: 'Username not found. Please check your credentials or register.' });
    }

    console.log('User found:', { id: user.id, username: user.username, hasPasswordHash: !!user.password_hash });

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Account setup incomplete. Please register again.' });
    }

    let valid = false;
    try {
      valid = await comparePassword(password, user.password_hash);
    } catch (compareErr) {
      console.error('Password comparison error:', compareErr);
      return res.status(500).json({ error: 'Authentication error. Please try again.' });
    }

    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: { id: user.id, username: user.username },
      subscription: {
        tier: user.subscription_tier || 'free',
        trialEndsAt: user.trial_ends_at,
        subscriptionEndsAt: user.subscription_ends_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Login with access code
router.post('/login-code', async (req: Request, res: Response) => {
  try {
    const { accessCode } = req.body;

    console.log('Login attempt with access code:', accessCode);

    if (!accessCode) {
      return res.status(400).json({ error: 'Please enter your access code.' });
    }

    const db = getDB();
    const user = db.prepare(`SELECT id, username, subscription_tier, trial_ends_at, subscription_ends_at FROM users WHERE access_code = ?`).get([accessCode]) as any;

    if (!user) {
      return res.status(401).json({ error: 'Access code not recognized. Please check and try again.' });
    }

    const token = generateToken(user.id);

    console.log('Login successful for user:', user.username);

    res.json({
      token,
      user: { id: user.id, username: user.username },
      subscription: {
        tier: user.subscription_tier || 'free',
        trialEndsAt: user.trial_ends_at,
        subscriptionEndsAt: user.subscription_ends_at
      }
    });
  } catch (error) {
    console.error('Access code login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Set or update access code (authenticated)
router.post('/set-access-code', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { accessCode } = req.body;

    console.log('Setting access code:', { userId, accessCode });

    if (!accessCode || !accessCode.trim()) {
      return res.status(400).json({ error: 'Access code required' });
    }

    const validation = validateAccessCode(accessCode.trim());
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const db = getDB();
    
    // Check if access code already exists for another user
    const existing = db.prepare(`SELECT id FROM users WHERE access_code = ? AND id != ?`).get([accessCode.trim(), userId]);
    if (existing) {
      return res.status(409).json({ error: 'This access code is already taken. Please choose another.' });
    }

    // Update access code
    run('UPDATE users SET access_code = ? WHERE id = ?', [accessCode.trim(), userId]);
    
    console.log('Access code updated successfully for user:', userId);

    res.json({ success: true, accessCode: accessCode.trim() });
  } catch (error) {
    console.error('Set access code error:', error);
    res.status(500).json({ error: 'Failed to set access code' });
  }
});

// Get current user info (authenticated)
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const db = getDB();
    
    const result = db.exec(`SELECT id, username, access_code, subscription_tier, trial_ends_at, subscription_ends_at FROM users WHERE id = ${userId}`);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const row = result[0].values[0];
    res.json({
      id: row[0],
      username: row[1],
      accessCode: row[2],
      subscription: {
        tier: 'free',
        trialEndsAt: null,
        subscriptionEndsAt: null
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Update subscription (authenticated)
router.post('/update-subscription', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { tier, subscriptionEndsAt } = req.body;

    const normalizedTier = tier || 'free';
    const expiresAt = subscriptionEndsAt || null;

    run(
      'UPDATE users SET subscription_tier = ?, subscription_ends_at = ? WHERE id = ?',
      [normalizedTier, expiresAt, userId]
    );

    res.json({ 
      success: true,
      subscription: {
        tier: normalizedTier,
        trialEndsAt: null,
        subscriptionEndsAt: expiresAt
      }
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Create a single-use premium activation token for the authenticated user
router.post('/premium/create-token', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const token = generatePremiumToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(); // 48h validity

    run(
      'INSERT INTO premium_tokens (token, plan, created_for_user_id, expires_at) VALUES (?, ?, ?, ?)',
      [token, 'premium', userId, expiresAt]
    );

    res.json({
      success: true,
      token,
      redeemPath: `/getpremium-${token}`,
      expiresAt
    });
  } catch (error) {
    console.error('Create premium token error:', error);
    res.status(500).json({ error: 'Failed to create premium token' });
  }
});

// Create activation token from Stripe session (for post-payment flow)
router.post('/premium/create-from-stripe', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { stripeSessionId } = req.body;

    if (!stripeSessionId) {
      return res.status(400).json({ error: 'Stripe session ID required' });
    }

    // In production, validate the session with Stripe API here
    // For now, just generate the token
    const token = generatePremiumToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString();

    run(
      'INSERT INTO premium_tokens (token, plan, created_for_user_id, expires_at) VALUES (?, ?, ?, ?)',
      [token, 'premium', userId, expiresAt]
    );

    res.json({
      success: true,
      token,
      redeemPath: `/getpremium-${token}`
    });
  } catch (error) {
    console.error('Create token from Stripe error:', error);
    res.status(500).json({ error: 'Failed to create activation token' });
  }
});

// Redeem a premium activation token (single-use)
router.post('/premium/redeem', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Activation token is required' });
    }

    const db = getDB();
    const record = db.prepare(
      `SELECT token, plan, created_for_user_id, expires_at, redeemed_at, redeemed_by_user_id
       FROM premium_tokens WHERE token = ?`
    ).get([token]) as any;

    if (!record) {
      return res.status(404).json({ error: 'Activation link not found or already used' });
    }

    if (record.created_for_user_id && record.created_for_user_id !== userId) {
      return res.status(403).json({ error: 'This activation link is assigned to a different account' });
    }

    if (record.redeemed_at) {
      return res.status(400).json({ error: 'Activation link has already been used' });
    }

    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Activation link has expired' });
    }

    const premiumUntil = oneYearFromNow();
    const redeemedAt = new Date().toISOString();

    run(
      'UPDATE users SET subscription_tier = ?, subscription_ends_at = ? WHERE id = ?',
      ['premium', premiumUntil, userId]
    );

    run(
      'UPDATE premium_tokens SET redeemed_at = ?, redeemed_by_user_id = ? WHERE token = ?',
      [redeemedAt, userId, token]
    );

    res.json({
      success: true,
      subscription: {
        tier: 'premium',
        trialEndsAt: null,
        subscriptionEndsAt: premiumUntil
      },
      message: 'Premium activated for 1 year.'
    });
  } catch (error) {
    console.error('Redeem premium token error:', error);
    res.status(500).json({ error: 'Failed to redeem premium token' });
  }
});

export default router;
