import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://mizan-messagelunaai-cloud.aws-us-east-2.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njc2Nzg1ODYsImlkIjoiNmQ3MWM1YzEtMGQxOC00Zjg0LTk5ZDAtNGY0MGVkY2QzYzAyIiwicmlkIjoiODhlNWQzMWQtYmU5Yy00OGE5LTkwOWQtNjRkZDZhYTVhNDY1In0.JE8V9k2BBLKOK2c3oglo8USnDh4HwUT3q-pg2nMCGpsw623AuBVYjsaeybcRIQMKY8aQUiIwauo-CoASswz5Ag'
});

// Wrapper for execute - returns a result set
function run(sql: string, params: any[] = []) {
  return client.execute({ sql, args: params });
}

// Wrapper for batch execution
async function exec(sql: string) {
  return client.execute(sql);
}

async function tryExec(sql: string) {
  try {
    await exec(sql);
  } catch (err) {
    // Best-effort migration; ignore if column/table already exists
    console.warn('Migration skipped:', (err as Error).message);
  }
}

export function getDB() {
  return client;
}

// Initialize database tables
export async function initDatabase() {
  // Users table
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      access_code TEXT UNIQUE,
      subscription_tier TEXT DEFAULT 'free',
      trial_ends_at DATETIME,
      subscription_ends_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Backfill new user columns for premium v2 + schema versioning
  await tryExec('ALTER TABLE users ADD COLUMN clerk_id TEXT');
  await tryExec('ALTER TABLE users ADD COLUMN email TEXT');
  await tryExec('ALTER TABLE users ADD COLUMN premium_until DATETIME');
  await tryExec('ALTER TABLE users ADD COLUMN pledge_accepted_at DATETIME');
  await tryExec('ALTER TABLE users ADD COLUMN premium_started_at DATETIME');
  await tryExec('ALTER TABLE users ADD COLUMN commitment_ends_at DATETIME');
  await tryExec('ALTER TABLE users ADD COLUMN schema_version INTEGER DEFAULT 1');

  // Checkins table - stores daily accountability data
  await exec(`
    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      categories TEXT NOT NULL,
      penalties INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, date)
    )
  `);

  // Cycles table - stores 7-day cycle progress
  await exec(`
    CREATE TABLE IF NOT EXISTS cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      cycle_number INTEGER NOT NULL,
      days TEXT NOT NULL,
      completed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, cycle_number)
    )
  `);

  // Settings table
  await exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      settings TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await tryExec('ALTER TABLE settings ADD COLUMN settings_json TEXT');
  await tryExec('ALTER TABLE settings ADD COLUMN schema_version INTEGER DEFAULT 1');

  // Daily entries for premium v2 strict mode
  await exec(`
    CREATE TABLE IF NOT EXISTS daily_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      sealed_at DATETIME,
      locked_at DATETIME,
      edit_window_minutes INTEGER DEFAULT 60,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, date)
    )
  `);

  // Debts ledger
  await exec(`
    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Reports store content snapshots
  await exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      content_json TEXT NOT NULL,
      locked INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, month)
    )
  `);

  // Premium tokens table - single use activation tokens
  await exec(`
    CREATE TABLE IF NOT EXISTS premium_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      plan TEXT DEFAULT 'premium',
      created_for_user_id INTEGER,
      expires_at DATETIME,
      redeemed_at DATETIME,
      redeemed_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_for_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (redeemed_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Activation codes table - for cross-device premium activation
  await exec(`
    CREATE TABLE IF NOT EXISTS activation_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      clerk_user_id TEXT NOT NULL,
      plan TEXT NOT NULL,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Database initialized');
}

export { run, exec };
