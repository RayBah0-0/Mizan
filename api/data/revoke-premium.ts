import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Create database client
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://mizan-messagelunaai-cloud.aws-us-east-2.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njc2Nzg1ODYsImlkIjoiNmQ3MWM1YzEtMGQxOC00Zjg0LTk5ZDAtNGY0MGVkY2QzYzAyIiwicmlkIjoiODhlNWQzMWQtYmU5Yy00OGE5LTkwOWQtNjRkZDZhYTVhNDY1In0.JE8V9k2BBLKOK2c3oglo8USnDh4HwUT3q-pg2nMCGpsw623AuBVYjsaeybcRIQMKY8aQUiIwauo-CoASswz5Ag'
    });
    
    // Remove premium by setting premium_until to NULL
    await db.execute({
      sql: 'UPDATE users SET premium_until = NULL WHERE clerk_id = ?',
      args: [userId]
    });

    return res.status(200).json({ success: true, message: 'Premium revoked' });
  } catch (error) {
    console.error('Error revoking premium:', error);
    return res.status(500).json({ error: 'Failed to revoke premium', details: (error as Error).message });
  }
}
