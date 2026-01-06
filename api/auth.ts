import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Router } from 'express';
import authRouter from '../server/src/routes/auth.js';

// Vercel serverless function wrapper
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Forward to Express router
  return authRouter(req as any, res as any, () => {});
}
