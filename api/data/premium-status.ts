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
  await ensureDB();

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Extract userId from Clerk token (simplified - in production, verify the JWT)
  const token = authHeader.substring(7);
  
  // For now, we'll extract the userId from the token payload without full verification
  // In production, you should verify the JWT signature
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.sub;

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
        
        return res.status(200).json({
          active,
          expiresAt: premiumUntil === 'lifetime' ? null : premiumUntil
        });
      } else {
        return res.status(200).json({ active: false, expiresAt: null });
      }
    } else {
      // User doesn't exist in DB yet, create entry
      await db.execute({
        sql: 'INSERT INTO users (clerk_id, username, created_at) VALUES (?, ?, ?)',
        args: [userId, userId, new Date().toISOString()]
      });
      return res.status(200).json({ active: false, expiresAt: null });
    }
  } catch (error) {
    console.error('Error getting premium status:', error);
    return res.status(500).json({ error: 'Failed to get premium status' });
  }
}
