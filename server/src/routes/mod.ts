import { Router, Request, Response } from 'express';
import { getDB } from '../database.js';
import { authMiddleware } from '../auth.js';
import type { ModLevel, ModActionType, PremiumSource } from '../types/mod.js';

// ⚠️ CRITICAL AUDIT LOG RULE:
// Audit logs are WRITE-ONLY and PERMANENT.
// NO endpoint should ever DELETE or EDIT audit log entries.
// If logs grow too large, ARCHIVE them - never delete.
// The moment logs can be modified, the system becomes untrustworthy.

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Middleware to check mod status
async function modMiddleware(req: Request, res: Response, next: Function) {
  const userId = (req as any).userId;
  const db = getDB();

  try {
    const result = await db.execute({
      sql: 'SELECT mod_level FROM mod_users WHERE user_id = ?',
      args: [userId]
    });

    const modUser = result.rows[0];
    
    if (!modUser || modUser.mod_level === 'none') {
      return res.status(403).json({ error: 'Access denied: Mod privileges required' });
    }

    // Store mod level in request for downstream use
    (req as any).modLevel = modUser.mod_level as ModLevel;
    next();
  } catch (error) {
    console.error('Mod check error:', error);
    return res.status(500).json({ error: 'Failed to verify mod status' });
  }
}

// Log mod action to audit log
async function logModAction(
  modUserId: number,
  actionType: ModActionType,
  actionDetails: any,
  reason: string | null,
  targetUserId: number | null,
  ipAddress: string | null
) {
  const db = getDB();
  
  await db.execute({
    sql: `INSERT INTO mod_audit_log 
          (mod_user_id, target_user_id, action_type, action_details, reason, ip_address, timestamp) 
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [
      modUserId,
      targetUserId,
      actionType,
      JSON.stringify(actionDetails),
      reason,
      ipAddress
    ]
  });
}

// GET /api/mod/check-status - Check if current user is a mod
router.get('/check-status', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const db = getDB();

  try {
    const result = await db.execute({
      sql: 'SELECT mod_level, granted_at FROM mod_users WHERE user_id = ?',
      args: [userId]
    });

    const modUser = result.rows[0];

    if (!modUser || modUser.mod_level === 'none') {
      return res.json({ isMod: false, modLevel: 'none' });
    }

    res.json({
      isMod: true,
      modLevel: modUser.mod_level,
      grantedAt: modUser.granted_at
    });
  } catch (error) {
    console.error('Check mod status error:', error);
    res.status(500).json({ error: 'Failed to check mod status' });
  }
});

// GET /api/mod/admin-grant-notification - Get admin grant notification for current user
router.get('/admin-grant-notification', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const db = getDB();

    // Get pending admin grant notification
    const result = await db.execute({
      sql: 'SELECT pending_admin_grant FROM users WHERE id = ?',
      args: [userId]
    });

    if (!result.rows || result.rows.length === 0) {
      return res.json({ hasGrant: false });
    }

    const pendingGrant = result.rows[0].pending_admin_grant as string | null;
    
    if (!pendingGrant) {
      return res.json({ hasGrant: false });
    }

    // Parse the grant data
    const grantData = JSON.parse(pendingGrant);

    // Clear the pending notification
    await db.execute({
      sql: 'UPDATE users SET pending_admin_grant = NULL WHERE id = ?',
      args: [userId]
    });

    return res.json({
      hasGrant: true,
      duration_days: grantData.duration_days,
      note: grantData.note,
      granted_at: grantData.granted_at
    });
  } catch (error) {
    console.error('Error fetching admin grant notification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mod/users/list - Get paginated list of users
router.get('/users/list', modMiddleware, async (req: Request, res: Response) => {
  const db = getDB();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search as string || '';

  try {
    // Build search condition
    let searchCondition = '';
    let searchArgs: any[] = [];
    
    if (search) {
      searchCondition = 'WHERE username LIKE ? OR email LIKE ?';
      searchArgs = [`%${search}%`, `%${search}%`];
    }

    // Get total count
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM users ${searchCondition}`,
      args: searchArgs
    });
    const total = Number(countResult.rows[0].total);

    // Get paginated users
    const result = await db.execute({
      sql: `SELECT 
              id, 
              username, 
              email, 
              created_at, 
              subscription_tier,
              premium_until
            FROM users 
            ${searchCondition}
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?`,
      args: [...searchArgs, limit, offset]
    });

    // Get premium source for each user
    const usersWithSource = await Promise.all(
      result.rows.map(async (user: any) => {
        const sourceResult = await db.execute({
          sql: 'SELECT source FROM premium_overrides WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
          args: [user.id]
        });
        
        return {
          ...user,
          premium_source: sourceResult.rows[0]?.source || null
        };
      })
    );

    res.json({
      users: usersWithSource,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// GET /api/mod/users/:userId/details - Get detailed user info
router.get('/users/:userId/details', modMiddleware, async (req: Request, res: Response) => {
  const db = getDB();
  const targetUserId = parseInt(req.params.userId);
  const modUserId = (req as any).userId;
  const ipAddress = req.ip || req.socket.remoteAddress || null;

  try {
    // Get user basic info
    const userResult = await db.execute({
      sql: `SELECT 
              id,
              username,
              email,
              clerk_id,
              created_at,
              subscription_tier,
              premium_until,
              premium_started_at
            FROM users 
            WHERE id = ?`,
      args: [targetUserId]
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get check-in count
    const checkinResult = await db.execute({
      sql: 'SELECT COUNT(*) as total FROM checkins WHERE user_id = ?',
      args: [targetUserId]
    });

    // Get cycle count
    const cycleResult = await db.execute({
      sql: 'SELECT COUNT(*) as total FROM cycles WHERE user_id = ?',
      args: [targetUserId]
    });

    // Get last check-in date
    const lastCheckinResult = await db.execute({
      sql: 'SELECT date FROM checkins WHERE user_id = ? ORDER BY date DESC LIMIT 1',
      args: [targetUserId]
    });

    // Get premium source
    const sourceResult = await db.execute({
      sql: 'SELECT source, granted_by_mod_id, override_reason, created_at FROM premium_overrides WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      args: [targetUserId]
    });

    // Calculate account age
    const createdDate = new Date(user.created_at as string);
    const now = new Date();
    const accountAgeDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    // Log this action (viewing user details is a high-signal read)
    await logModAction(
      modUserId,
      'view_user_activity',
      { userId: targetUserId },
      null,
      targetUserId,
      ipAddress
    );

    res.json({
      user: {
        ...user,
        total_checkins: checkinResult.rows[0].total,
        total_cycles: cycleResult.rows[0].total,
        last_checkin_date: lastCheckinResult.rows[0]?.date || null,
        account_age_days: accountAgeDays,
        premium_source: sourceResult.rows[0]?.source || null,
        premium_granted_by_mod_id: sourceResult.rows[0]?.granted_by_mod_id || null,
        premium_override_reason: sourceResult.rows[0]?.override_reason || null
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

// GET /api/mod/users/:userId/activity - Get user's recent activity
router.get('/users/:userId/activity', modMiddleware, async (req: Request, res: Response) => {
  const db = getDB();
  const targetUserId = parseInt(req.params.userId);
  const limit = parseInt(req.query.limit as string) || 30;

  try {
    // Get recent check-ins
    const checkinResult = await db.execute({
      sql: `SELECT date, categories, completed, created_at 
            FROM checkins 
            WHERE user_id = ? 
            ORDER BY date DESC 
            LIMIT ?`,
      args: [targetUserId, limit]
    });

    // Get recent cycles
    const cycleResult = await db.execute({
      sql: `SELECT cycle_number, days, completed, created_at 
            FROM cycles 
            WHERE user_id = ? 
            ORDER BY cycle_number DESC 
            LIMIT ?`,
      args: [targetUserId, Math.floor(limit / 7)]
    });

    res.json({
      checkins: checkinResult.rows.map(row => ({
        ...row,
        categories: JSON.parse(row.categories as string)
      })),
      cycles: cycleResult.rows.map(row => ({
        ...row,
        days: JSON.parse(row.days as string)
      }))
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Failed to get user activity' });
  }
});

// POST /api/mod/users/:userId/grant-premium - Grant premium to user
router.post('/users/:userId/grant-premium', modMiddleware, async (req: Request, res: Response) => {
  const db = getDB();
  const targetUserId = parseInt(req.params.userId);
  const modUserId = (req as any).userId;
  const modLevel = (req as any).modLevel as ModLevel;
  const ipAddress = req.ip || req.socket.remoteAddress || null;
  const { reason, duration_days } = req.body;

  // Validate reason is provided
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(400).json({ error: 'Reason is required for granting premium' });
  }

  // Only full or super_admin can grant premium
  if (modLevel === 'read_only') {
    return res.status(403).json({ error: 'Read-only mods cannot grant premium' });
  }

  try {
    // Get current user state
    const userResult = await db.execute({
      sql: 'SELECT subscription_tier, premium_until FROM users WHERE id = ?',
      args: [targetUserId]
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = userResult.rows[0];
    const durationDays = duration_days || 365; // Default to 1 year
    const premiumUntil = new Date();
    premiumUntil.setDate(premiumUntil.getDate() + durationDays);

    // Prepare admin grant notification data
    const grantNotification = JSON.stringify({
      duration_days: durationDays,
      note: reason.trim(),
      granted_at: new Date().toISOString()
    });

    // Update user premium status
    await db.execute({
      sql: `UPDATE users 
            SET subscription_tier = 'premium', 
                premium_until = ?,
                premium_started_at = COALESCE(premium_started_at, datetime('now')),
                pending_admin_grant = ?
            WHERE id = ?`,
      args: [premiumUntil.toISOString(), grantNotification, targetUserId]
    });

    // Record premium override
    await db.execute({
      sql: `INSERT INTO premium_overrides 
            (user_id, source, granted_by_mod_id, override_reason, premium_until, created_at) 
            VALUES (?, 'manual_override', ?, ?, ?, datetime('now'))`,
      args: [targetUserId, modUserId, reason.trim(), premiumUntil.toISOString()]
    });

    // Log action
    await logModAction(
      modUserId,
      'grant_premium',
      {
        before: { 
          subscription_tier: currentUser.subscription_tier,
          premium_until: currentUser.premium_until
        },
        after: { 
          subscription_tier: 'premium',
          premium_until: premiumUntil.toISOString()
        },
        duration_days: durationDays
      },
      reason.trim(),
      targetUserId,
      ipAddress
    );

    res.json({
      success: true,
      message: 'Premium granted successfully',
      premium_until: premiumUntil.toISOString()
    });
  } catch (error) {
    console.error('Grant premium error:', error);
    res.status(500).json({ error: 'Failed to grant premium' });
  }
});

// POST /api/mod/users/:userId/revoke-premium - Revoke premium from user
router.post('/users/:userId/revoke-premium', modMiddleware, async (req: Request, res: Response) => {
  const db = getDB();
  const targetUserId = parseInt(req.params.userId);
  const modUserId = (req as any).userId;
  const modLevel = (req as any).modLevel as ModLevel;
  const ipAddress = req.ip || req.socket.remoteAddress || null;
  const { reason } = req.body;

  // Validate reason is provided
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(400).json({ error: 'Reason is required for revoking premium' });
  }

  // Only full or super_admin can revoke premium
  if (modLevel === 'read_only') {
    return res.status(403).json({ error: 'Read-only mods cannot revoke premium' });
  }

  try {
    // Get current user state
    const userResult = await db.execute({
      sql: 'SELECT subscription_tier, premium_until FROM users WHERE id = ?',
      args: [targetUserId]
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = userResult.rows[0];

    // Check if premium was manually granted (don't revoke Stripe subscriptions)
    const sourceResult = await db.execute({
      sql: 'SELECT source FROM premium_overrides WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      args: [targetUserId]
    });

    const premiumSource = sourceResult.rows[0]?.source;

    // ⚠️ CRITICAL: NEVER allow revoking Stripe subscriptions.
    // This prevents mods from breaking user payments.
    // Stripe sync logic must NEVER touch manual_override entries.
    if (premiumSource === 'stripe') {
      return res.status(400).json({ 
        error: 'Cannot revoke Stripe-managed premium. User must cancel through Stripe.' 
      });
    }

    // Update user premium status
    await db.execute({
      sql: `UPDATE users 
            SET subscription_tier = 'free', 
                premium_until = NULL
            WHERE id = ?`,
      args: [targetUserId]
    });

    // Log action
    await logModAction(
      modUserId,
      'revoke_premium',
      {
        before: { 
          subscription_tier: currentUser.subscription_tier,
          premium_until: currentUser.premium_until
        },
        after: { 
          subscription_tier: 'free',
          premium_until: null
        }
      },
      reason.trim(),
      targetUserId,
      ipAddress
    );

    res.json({
      success: true,
      message: 'Premium revoked successfully'
    });
  } catch (error) {
    console.error('Revoke premium error:', error);
    res.status(500).json({ error: 'Failed to revoke premium' });
  }
});

// GET /api/mod/users/:userId/premium-history - Get premium status changes
router.get('/users/:userId/premium-history', modMiddleware, async (req: Request, res: Response) => {
  const db = getDB();
  const targetUserId = parseInt(req.params.userId);
  const modUserId = (req as any).userId;
  const ipAddress = req.ip || req.socket.remoteAddress || null;

  try {
    // Get premium override history
    const result = await db.execute({
      sql: `SELECT 
              po.source,
              po.granted_by_mod_id,
              po.override_reason,
              po.premium_until,
              po.created_at,
              u.username as granted_by_username
            FROM premium_overrides po
            LEFT JOIN mod_users mu ON po.granted_by_mod_id = mu.user_id
            LEFT JOIN users u ON mu.user_id = u.id
            WHERE po.user_id = ?
            ORDER BY po.created_at DESC`,
      args: [targetUserId]
    });

    // Get audit log for this user's premium changes
    const auditResult = await db.execute({
      sql: `SELECT 
              mal.action_type,
              mal.action_details,
              mal.reason,
              mal.timestamp,
              u.username as mod_username
            FROM mod_audit_log mal
            LEFT JOIN users u ON mal.mod_user_id = u.id
            WHERE mal.target_user_id = ? 
              AND (mal.action_type = 'grant_premium' OR mal.action_type = 'revoke_premium')
            ORDER BY mal.timestamp DESC`,
      args: [targetUserId]
    });

    // Log this action (viewing premium history is sensitive)
    await logModAction(
      modUserId,
      'view_premium_history',
      { userId: targetUserId },
      null,
      targetUserId,
      ipAddress
    );

    res.json({
      overrides: result.rows.map(row => ({
        ...row,
        override_reason: row.override_reason
      })),
      audit_log: auditResult.rows.map(row => ({
        ...row,
        action_details: JSON.parse(row.action_details as string)
      }))
    });
  } catch (error) {
    console.error('Get premium history error:', error);
    res.status(500).json({ error: 'Failed to get premium history' });
  }
});

// GET /api/mod/audit/logs - Get audit logs
router.get('/audit/logs', modMiddleware, async (req: Request, res: Response) => {
  const db = getDB();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;
  const actionType = req.query.action_type as string;
  const modLevel = (req as any).modLevel as ModLevel;

  try {
    let filterCondition = '';
    let filterArgs: any[] = [];

    if (actionType) {
      filterCondition = 'WHERE action_type = ?';
      filterArgs = [actionType];
    }

    // Get total count
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM mod_audit_log ${filterCondition}`,
      args: filterArgs
    });
    const total = Number(countResult.rows[0].total);

    // Get logs with mod and target user info
    const result = await db.execute({
      sql: `SELECT 
              mal.id,
              mal.mod_user_id,
              mal.target_user_id,
              mal.action_type,
              mal.action_details,
              mal.reason,
              mal.ip_address,
              mal.timestamp,
              mod_user.username as mod_username,
              target_user.username as target_username
            FROM mod_audit_log mal
            LEFT JOIN users mod_user ON mal.mod_user_id = mod_user.id
            LEFT JOIN users target_user ON mal.target_user_id = target_user.id
            ${filterCondition}
            ORDER BY mal.timestamp DESC
            LIMIT ? OFFSET ?`,
      args: [...filterArgs, limit, offset]
    });

    res.json({
      logs: result.rows.map(row => ({
        ...row,
        action_details: JSON.parse(row.action_details as string),
        // Obfuscate IP for read_only mods
        ip_address: modLevel === 'read_only' ? null : row.ip_address
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

export default router;
