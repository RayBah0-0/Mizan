import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mizan-jwt-secret-2024-change-in-production';

let db: ReturnType<typeof createClient> | null = null;

function getDB() {
  if (!db) {
    const url = process.env.DATABASE_URL || 'file:./mizan.db';
    db = createClient({ url });
  }
  return db;
}

function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clerkId, email, username } = req.body;

    console.log('Clerk token request:', { clerkId, email, username });

    if (!clerkId || !email) {
      return res.status(400).json({ error: 'Clerk ID and email required' });
    }

    const database = getDB();

    // Try to find existing user by clerk_id
    let userResult = await database.execute({
      sql: 'SELECT id, premium_until FROM users WHERE clerk_id = ?',
      args: [clerkId]
    });

    let userId: number;

    if (userResult.rows.length > 0) {
      // User already exists
      userId = Number(userResult.rows[0].id);
      console.log('Found existing Clerk user:', userId);
    } else {
      // Create new user
      const generatedUsername = username || email.split('@')[0] || `user_${Date.now()}`;
      
      const insertResult = await database.execute({
        sql: 'INSERT INTO users (username, clerk_id, email) VALUES (?, ?, ?)',
        args: [generatedUsername, clerkId, email.toLowerCase()]
      });

      userId = Number(insertResult.lastInsertRowid);
      console.log('Created new Clerk user:', userId);

      // Initialize default settings
      await database.execute({
        sql: 'INSERT INTO settings (user_id, settings) VALUES (?, ?)',
        args: [userId, JSON.stringify({ requireThreeOfFive: true })]
      });
    }

    // Update email if it changed
    await database.execute({
      sql: 'UPDATE users SET email = ? WHERE id = ?',
      args: [email.toLowerCase(), userId]
    });

    const token = generateToken(userId);

    return res.status(200).json({
      token,
      userId,
      user: { id: userId, clerkId, email }
    });
  } catch (error) {
    console.error('Clerk token error:', error);
    return res.status(500).json({ error: 'Failed to process Clerk authentication' });
  }
}
