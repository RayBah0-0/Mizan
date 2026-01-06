import { Router, Request, Response } from 'express';
import { getDB, run } from '../database.js';
import { authMiddleware } from '../auth.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all user data (checkins, cycles, settings)
router.get('/sync', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const db = getDB();

    const checkinsResult = await db.execute({
      sql: 'SELECT date, categories, penalties, completed FROM checkins WHERE user_id = ? ORDER BY date',
      args: [userId]
    });

    const cyclesResult = await db.execute({
      sql: 'SELECT cycle_number, days, completed FROM cycles WHERE user_id = ? ORDER BY cycle_number',
      args: [userId]
    });

    const settingsResult = await db.execute({
      sql: 'SELECT settings FROM settings WHERE user_id = ?',
      args: [userId]
    });

    const checkins = checkinsResult.rows.map((row: any) => ({
      date: row.date,
      categories: JSON.parse(row.categories),
      penalties: row.penalties,
      completed: Boolean(row.completed)
    }));

    const cycles = cyclesResult.rows.map((row: any) => ({
      cycleNumber: row.cycle_number,
      days: JSON.parse(row.days),
      completed: Boolean(row.completed)
    }));

    const settings = settingsResult.rows.length > 0
      ? JSON.parse(settingsResult.rows[0].settings as string)
      : { requireThreeOfFive: true };

    res.json({ checkins, cycles, settings });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

// Save checkin
router.post('/checkins', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { date, categories, penalties, completed } = req.body;

    const db = getDB();
    
    // Check if exists
    const existing = await db.execute({ sql: 'SELECT id FROM checkins WHERE user_id = ? AND date = ?', args: [userId, date] });
    
    if (existing.rows.length > 0) {
      // Update
      await run(
        `UPDATE checkins SET categories = ?, penalties = ?, completed = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = ? AND date = ?`,
        [JSON.stringify(categories), penalties, completed ? 1 : 0, userId, date]
      );
    } else {
      // Insert
      await run(
        `INSERT INTO checkins (user_id, date, categories, penalties, completed, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, date, JSON.stringify(categories), penalties, completed ? 1 : 0]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Checkin save error:', error);
    res.status(500).json({ error: 'Failed to save checkin' });
  }
});

// Save cycle
router.post('/cycles', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { cycleNumber, days, completed } = req.body;

    const db = getDB();
    
    // Check if exists
    const existing = await db.execute({ sql: 'SELECT id FROM cycles WHERE user_id = ? AND cycle_number = ?', args: [userId, cycleNumber] });
    
    if (existing.rows.length > 0) {
      // Update
      await run(
        `UPDATE cycles SET days = ?, completed = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = ? AND cycle_number = ?`,
        [JSON.stringify(days), completed ? 1 : 0, userId, cycleNumber]
      );
    } else {
      // Insert
      await run(
        `INSERT INTO cycles (user_id, cycle_number, days, completed, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, cycleNumber, JSON.stringify(days), completed ? 1 : 0]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Cycle save error:', error);
    res.status(500).json({ error: 'Failed to save cycle' });
  }
});

// Save settings
router.post('/settings', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { settings } = req.body;

    const db = getDB();
    
    // Check if exists
    const existing = await db.execute({ sql: 'SELECT id FROM settings WHERE user_id = ?', args: [userId] });
    
    if (existing.rows.length > 0) {
      // Update
      await run(
        `UPDATE settings SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        [JSON.stringify(settings), userId]
      );
    } else {
      // Insert
      await run(
        `INSERT INTO settings (user_id, settings, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [userId, JSON.stringify(settings)]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Settings save error:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;
