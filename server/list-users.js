import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://mizan-messagelunaai-cloud.aws-us-east-2.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njc2Nzg1ODYsImlkIjoiNmQ3MWM1YzEtMGQxOC00Zjg0LTk5ZDAtNGY0MGVkY2QzYzAyIiwicmlkIjoiODhlNWQzMWQtYmU5Yy00OGE5LTkwOWQtNjRkZDZhYTVhNDY1In0.JE8V9k2BBLKOK2c3oglo8USnDh4HwUT3q-pg2nMCGpsw623AuBVYjsaeybcRIQMKY8aQUiIwauo-CoASswz5Ag'
});

const result = await client.execute('SELECT id, username, clerk_id, email, created_at FROM users ORDER BY id');

console.log(`\n📊 Total users: ${result.rows.length}\n`);
console.table(result.rows);
