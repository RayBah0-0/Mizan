import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDB, initDatabase } from '../../server/src/database';

let dbInitialized = false;
async function ensureDB() {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureDB();

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, plan, expiresAt } = req.body;

    if (!userId || !plan) {
      return res.status(400).json({ error: 'userId and plan are required' });
    }

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

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error setting premium:', error);
    return res.status(500).json({ error: 'Failed to set premium', details: (error as Error).message });
  }
}
