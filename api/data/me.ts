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

function paywallReason(isPremium: boolean, feature: string) {
  return isPremium ? null : feature;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let userId: number;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      userId = decoded.userId;
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const database = getDB();

    // Get user
    const userResult = await database.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [userId]
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get settings
    const settingsResult = await database.execute({
      sql: 'SELECT settings, settings_json, schema_version FROM settings WHERE user_id = ?',
      args: [userId]
    });

    let settings: any = { requireThreeOfFive: true };
    let featureFlags: any = { premiumV2: false, mizanStrictMode: false };
    let schemaVersion = 1;

    if (settingsResult.rows.length > 0) {
      const row = settingsResult.rows[0];
      const settingsJson = row.settings_json || row.settings;
      try {
        settings = settingsJson ? JSON.parse(settingsJson as string) : { requireThreeOfFive: true };
        featureFlags = settings.featureFlags || { premiumV2: false, mizanStrictMode: false };
        schemaVersion = row.schema_version ? Number(row.schema_version) : 1;
      } catch (e) {
        // Use defaults
      }
    }

    const isPremium = Boolean(
      (user.subscription_tier === 'premium' && (!user.subscription_ends_at || new Date(user.subscription_ends_at as string) > new Date())) ||
      (user.premium_until && new Date(user.premium_until as string) > new Date())
    );

    return res.status(200).json({
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
    return res.status(500).json({ error: 'Failed to load profile' });
  }
}
