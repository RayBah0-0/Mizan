import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://mizan-messagelunaai-cloud.aws-us-east-2.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njc2Nzg1ODYsImlkIjoiNmQ3MWM1YzEtMGQxOC00Zjg0LTk5ZDAtNGY0MGVkY2QzYzAyIiwicmlkIjoiODhlNWQzMWQtYmU5Yy00OGE5LTkwOWQtNjRkZDZhYTVhNDY1In0.JE8V9k2BBLKOK2c3oglo8USnDh4HwUT3q-pg2nMCGpsw623AuBVYjsaeybcRIQMKY8aQUiIwauo-CoASswz5Ag'
});

const users = [
  {
    clerk_id: 'user_2rNbGxKLzHsU9FqV4wXyTp6DmQa', // Replace with LUNA Ai's actual Clerk ID
    username: 'messageluna',
    email: 'messagelunaai@gmail.com'
  },
  {
    clerk_id: 'user_2rNbGxKLzHsU9FqV4wXyTp6DmQb', // Replace with Rayane Bahader's actual Clerk ID
    username: 'zxshi',
    email: 'rayane.s.bahader@gmail.com'
  }
];

console.log('⚠️  IMPORTANT: Update the clerk_id values in this script first!');
console.log('Go to Clerk Dashboard → Users → click each user → copy their User ID\n');

// Uncomment below after updating clerk_ids:

/*
for (const user of users) {
  try {
    await client.execute({
      sql: 'INSERT INTO users (clerk_id, username, email, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      args: [user.clerk_id, user.username, user.email]
    });
    console.log('✅ Added user:', user.username);
  } catch (error) {
    console.error('❌ Failed to add', user.username, ':', error.message);
  }
}

console.log('\n✅ Done! Refresh your admin panel.');
*/
