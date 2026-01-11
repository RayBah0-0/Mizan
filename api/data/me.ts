import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import dataRouter from '../../server/src/routes/data';
import { initDatabase } from '../../server/src/database';

const app = express();
app.use(cors({
  origin: ['https://mizan-vite.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use('/api/data', dataRouter);

let dbInitialized = false;
async function ensureDB() {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDB();
  // Rewrite the URL to match the router
  req.url = '/api/data/me';
  return app(req as any, res as any);
}
