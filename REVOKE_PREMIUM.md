# Premium Management Guide

## Option 1: Revoke Premium via API Endpoint

I've created a new endpoint at `/api/data/revoke-premium`

**Usage:**
```bash
curl -X POST https://mizan-vite.vercel.app/api/data/revoke-premium \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_CLERK_ID_HERE"}'
```

**Example with PowerShell:**
```powershell
$body = @{
    userId = "user_2abc123xyz"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://mizan-vite.vercel.app/api/data/revoke-premium" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

---

## Option 2: Direct Database Update (Turso CLI)

**Install Turso CLI:**
```bash
npm install -g @libsql/client
```

**Connect to your database:**
```bash
turso db shell mizan-messagelunaai-cloud
```

**Revoke premium from specific user:**
```sql
UPDATE users SET premium_until = NULL WHERE clerk_id = 'user_CLERK_ID_HERE';
```

**Revoke premium from multiple users:**
```sql
UPDATE users SET premium_until = NULL WHERE clerk_id IN ('user_id_1', 'user_id_2', 'user_id_3');
```

**Check current premium users:**
```sql
SELECT clerk_id, username, premium_until, premium_started_at 
FROM users 
WHERE premium_until IS NOT NULL;
```

---

## Option 3: Bulk Revoke via Script

Create a file `revoke-premium.js`:

```javascript
const userIds = [
  'user_2abc123xyz',
  'user_3def456abc',
  // Add more user IDs here
];

async function revokePremium() {
  for (const userId of userIds) {
    try {
      const response = await fetch('https://mizan-vite.vercel.app/api/data/revoke-premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const result = await response.json();
      console.log(`${userId}: ${result.message}`);
    } catch (error) {
      console.error(`${userId}: Failed`, error);
    }
  }
}

revokePremium();
```

Run with: `node revoke-premium.js`

---

## Finding User IDs

**From Clerk Dashboard:**
1. Go to https://dashboard.clerk.com
2. Navigate to Users
3. Click on a user to see their `user_id` (starts with `user_`)

**From your database:**
```sql
SELECT clerk_id, username FROM users WHERE premium_until IS NOT NULL;
```

---

## After Revoking

The user will automatically see premium features disabled on their next:
- Page refresh
- Login
- App restart

No action needed from the user - the server is the source of truth.
