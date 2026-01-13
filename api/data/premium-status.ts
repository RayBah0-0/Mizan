import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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

    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Create database client
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://mizan-messagelunaai-cloud.aws-us-east-2.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njc2Nzg1ODYsImlkIjoiNmQ3MWM1YzEtMGQxOC00Zjg0LTk5ZDAtNGY0MGVkY2QzYzAyIiwicmlkIjoiODhlNWQzMWQtYmU5Yy00OGE5LTkwOWQtNjRkZDZhYTVhNDY1In0.JE8V9k2BBLKOK2c3oglo8USnDh4HwUT3q-pg2nMCGpsw623AuBVYjsaeybcRIQMKY8aQUiIwauo-CoASswz5Ag'
    });

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
    return res.status(500).json({ error: 'Failed to get premium status', details: (error as Error).message });
  }
}
