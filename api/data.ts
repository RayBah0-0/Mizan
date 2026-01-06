import type { VercelRequest, VercelResponse } from '@vercel/node';
import dataRouter from '../server/src/routes/data.js';

// Vercel serverless function wrapper
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Forward to Express router
  return dataRouter(req as any, res as any, () => {});
}
