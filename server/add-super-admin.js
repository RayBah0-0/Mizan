import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://mizan-messagelunaai-cloud.aws-us-east-2.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njc2Nzg1ODYsImlkIjoiNmQ3MWM1YzEtMGQxOC00Zjg0LTk5ZDAtNGY0MGVkY2QzYzAyIiwicmlkIjoiODhlNWQzMWQtYmU5Yy00OGE5LTkwOWQtNjRkZDZhYTVhNDY1In0.JE8V9k2BBLKOK2c3oglo8USnDh4HwUT3q-pg2nMCGpsw623AuBVYjsaeybcRIQMKY8aQUiIwauo-CoASswz5Ag'
});

async function createModTables() {
  console.log('📦 Creating mod tables...');

  try {
    // Drop existing tables if they have wrong schema
    console.log('🗑️  Dropping old tables if they exist...');
    await client.execute('DROP TABLE IF EXISTS audit_log');
    await client.execute('DROP TABLE IF EXISTS mod_users');

    // Create mod_users table
    console.log('🔨 Creating mod_users table...');
    await client.execute(`
      CREATE TABLE mod_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        mod_level TEXT NOT NULL,
        granted_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create audit_log table
    console.log('🔨 Creating audit_log table...');
    await client.execute(`
      CREATE TABLE audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mod_user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        target_user_id INTEGER,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mod_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    throw error;
  }
}

async function addSuperAdmin() {
  // Your Clerk ID from earlier
  const CLERK_ID = 'user_380JxMFacEC95qFq3yRZwE8RZQi';

  // Create tables first
  await createModTables();

  console.log('\n🔍 Looking for user with Clerk ID:', CLERK_ID);

  // Find user by clerk_id
  const userResult = await client.execute({
    sql: 'SELECT id, clerk_id, username FROM users WHERE clerk_id = ?',
    args: [CLERK_ID]
  });

  if (!userResult.rows || userResult.rows.length === 0) {
    console.error('❌ User not found with Clerk ID:', CLERK_ID);
    console.log('\n💡 Make sure you have logged into the main Mizan app at least once.');
    process.exit(1);
  }

  const userId = userResult.rows[0].id;
  const username = userResult.rows[0].username;

  console.log('✅ Found user:', { id: userId, username, clerk_id: CLERK_ID });

  // Check if already a mod
  const modCheck = await client.execute({
    sql: 'SELECT mod_level FROM mod_users WHERE user_id = ?',
    args: [userId]
  });

  if (modCheck.rows && modCheck.rows.length > 0) {
    console.log('⚠️  User is already a moderator with level:', modCheck.rows[0].mod_level);
    console.log('Updating to super_admin...');
    
    await client.execute({
      sql: 'UPDATE mod_users SET mod_level = ? WHERE user_id = ?',
      args: ['super_admin', userId]
    });
  } else {
    console.log('➕ Adding user to mod_users as super_admin...');
    
    await client.execute({
      sql: 'INSERT INTO mod_users (user_id, mod_level) VALUES (?, ?)',
      args: [userId, 'super_admin']
    });
  }

  // Verify
  const verify = await client.execute({
    sql: `
      SELECT u.id, u.username, u.clerk_id, mu.mod_level
      FROM users u
      JOIN mod_users mu ON mu.user_id = u.id
      WHERE u.id = ?
    `,
    args: [userId]
  });

  console.log('\n✅ SUCCESS! Mod status verified:');
  console.log(verify.rows[0]);
  console.log('\n🎉 You can now access the admin panel!');
}

addSuperAdmin().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
