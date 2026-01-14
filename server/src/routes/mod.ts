import { Router, Request, Response } from 'express';
import { getDB } from '../database.js';

const router = Router();

// Clerk auth middleware for mod routes
async function clerkAuthMiddleware(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  
  // Verify Clerk token and extract user ID
  try {
    // Decode the JWT to get the Clerk user ID (sub claim)
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    const clerkUserId = payload.sub;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Invalid token: no user ID' });
    }

    // Look up the user by clerk_id to get internal user_id
    const db = getDB();
    const result = await db.execute({
      sql: 'SELECT id FROM users WHERE clerk_id = ?',
      args: [clerkUserId]
    });

    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const userId = result.rows[0].id as number;
    (req as any).userId = userId;
    (req as any).clerkUserId = clerkUserId;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Apply Clerk auth middleware to all mod routes
router.use(clerkAuthMiddleware);

// Middleware to check mod authorization
async function modMiddleware(req: Request, res: Response, next: any) {
  const userId = (req as any).userId;
  
  const db = getDB();
  const result = await db.execute({
    sql: 'SELECT mod_level FROM mod_users WHERE user_id = ?',
    args: [userId]
  });

  if (!result.rows || result.rows.length === 0) {
    return res.status(403).json({ error: 'Unauthorized: Not a moderator' });
  }

  const modLevel = result.rows[0].mod_level as string;
  (req as any).modLevel = modLevel;
  next();
}

// Check if user is a moderator
router.get('/check-status', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  try {
    const db = getDB();
    const result = await db.execute({
      sql: 'SELECT mod_level FROM mod_users WHERE user_id = ?',
      args: [userId]
    });

    if (!result.rows || result.rows.length === 0) {
      return res.json({ authorized: false, mod_level: null });
    }

    const modLevel = result.rows[0].mod_level as string;
    return res.json({ authorized: true, mod_level: modLevel });
  } catch (error) {
    console.error('Error checking mod status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get list of all users (moderators only)
router.get('/users/list', modMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';

    const db = getDB();
    
    let sql = `
      SELECT 
        u.id,
        u.username,
        u.clerk_id,
        u.email,
        u.subscription_tier,
        u.premium_until,
        u.created_at,
        COUNT(DISTINCT c.id) as total_checkins,
        COUNT(DISTINCT cy.id) as total_cycles
      FROM users u
      LEFT JOIN checkins c ON c.user_id = u.id
      LEFT JOIN cycles cy ON cy.user_id = u.id
    `;

    const params: any[] = [];
    
    if (search) {
      sql += ' WHERE u.username LIKE ? OR u.email LIKE ? OR u.clerk_id LIKE ?';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await db.execute({ sql, args: params });

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM users';
    const countParams: any[] = [];
    
    if (search) {
      countSql += ' WHERE username LIKE ? OR email LIKE ? OR clerk_id LIKE ?';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countResult = await db.execute({ sql: countSql, args: countParams });
    const total = Number(countResult.rows[0]?.total || 0);

    return res.json({
      users: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed user info
router.get('/users/:userId/details', modMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const db = getDB();

    // Get user details
    const userResult = await db.execute({
      sql: `
        SELECT 
          u.*,
          COUNT(DISTINCT c.id) as total_checkins,
          COUNT(DISTINCT cy.id) as total_cycles,
          SUM(CASE WHEN c.completed = 1 THEN 1 ELSE 0 END) as completed_checkins
        FROM users u
        LEFT JOIN checkins c ON c.user_id = u.id
        LEFT JOIN cycles cy ON cy.user_id = u.id
        WHERE u.id = ?
        GROUP BY u.id
      `,
      args: [userId]
    });

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: userResult.rows[0] });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user activity (checkins)
router.get('/users/:userId/activity', modMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 30;

    const db = getDB();
    const result = await db.execute({
      sql: `
        SELECT 
          id, date, categories, penalties, completed, created_at, updated_at
        FROM checkins
        WHERE user_id = ?
        ORDER BY date DESC
        LIMIT ?
      `,
      args: [userId, limit]
    });

    return res.json({ activity: result.rows });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user premium history (from audit log)
router.get('/users/:userId/premium-history', modMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const db = getDB();

    const result = await db.execute({
      sql: `
        SELECT 
          a.id,
          a.action,
          a.details,
          a.created_at,
          m.username as mod_username
        FROM audit_log a
        LEFT JOIN users m ON m.id = a.mod_user_id
        WHERE a.target_user_id = ? 
        AND (a.action = 'grant_premium' OR a.action = 'revoke_premium')
        ORDER BY a.created_at DESC
      `,
      args: [userId]
    });

    return res.json({ history: result.rows || [] });
  } catch (error) {
    console.error('Error fetching premium history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Grant premium access (super_admin only)
router.post('/users/:userId/grant-premium', modMiddleware, async (req: Request, res: Response) => {
  const modLevel = (req as any).modLevel;
  if (modLevel !== 'super_admin') {
    return res.status(403).json({ error: 'Unauthorized: super_admin only' });
  }

  try {
    const userId = parseInt(req.params.userId);
    const { duration_days, reason } = req.body;

    if (!duration_days || duration_days <= 0) {
      return res.status(400).json({ error: 'Invalid duration' });
    }

    const db = getDB();
    const premiumUntil = new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000).toISOString();

    // Prepare admin grant notification data
    const grantNotification = JSON.stringify({
      duration_days,
      note: reason || '',
      granted_at: new Date().toISOString()
    });

    // Update user premium status
    await db.execute({
      sql: `
        UPDATE users 
        SET 
          subscription_tier = 'premium',
          premium_until = ?,
          premium_started_at = COALESCE(premium_started_at, CURRENT_TIMESTAMP),
          pending_admin_grant = ?
        WHERE id = ?
      `,
      args: [premiumUntil, grantNotification, userId]
    });

    // Log the action
    const modUserId = (req as any).userId;
    await db.execute({
      sql: `
        INSERT INTO audit_log (mod_user_id, action, target_user_id, details)
        VALUES (?, 'grant_premium', ?, ?)
      `,
      args: [modUserId, userId, JSON.stringify({ duration_days, reason, premium_until: premiumUntil })]
    });

    return res.json({ success: true, premium_until: premiumUntil });
  } catch (error) {
    console.error('Error granting premium:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke premium access (super_admin only)
router.post('/users/:userId/revoke-premium', modMiddleware, async (req: Request, res: Response) => {
  const modLevel = (req as any).modLevel;
  if (modLevel !== 'super_admin') {
    return res.status(403).json({ error: 'Unauthorized: super_admin only' });
  }

  try {
    const userId = parseInt(req.params.userId);
    const { reason } = req.body;

    const db = getDB();
    await db.execute({
      sql: `
        UPDATE users 
        SET 
          subscription_tier = 'free',
          premium_until = NULL
        WHERE id = ?
      `,
      args: [userId]
    });

    // Log the action
    const modUserId = (req as any).userId;
    await db.execute({
      sql: `
        INSERT INTO audit_log (mod_user_id, action, target_user_id, details)
        VALUES (?, 'revoke_premium', ?, ?)
      `,
      args: [modUserId, userId, JSON.stringify({ reason })]
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error revoking premium:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get admin grant notification for current user (authenticated users only)
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

// Get audit log (moderators only)
router.get('/audit/logs', modMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const db = getDB();
    const result = await db.execute({
      sql: `
        SELECT 
          a.id,
          a.action,
          a.details,
          a.created_at,
          m.username as mod_username,
          u.username as target_username
        FROM audit_log a
        LEFT JOIN users m ON m.id = a.mod_user_id
        LEFT JOIN users u ON u.id = a.target_user_id
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [limit, offset]
    });

    const countResult = await db.execute({
      sql: 'SELECT COUNT(*) as total FROM audit_log',
      args: []
    });
    const total = Number(countResult.rows[0]?.total || 0);

    return res.json({
      logs: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
