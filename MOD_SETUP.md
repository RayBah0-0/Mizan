# MOD SYSTEM - MANUAL SETUP GUIDE

**⚠️ IMPORTANT: Tables are NOT auto-created. You must create them manually in Turso.**

## Database Tables to Create

### 1. mod_users
```sql
CREATE TABLE mod_users (
  user_id INTEGER PRIMARY KEY,
  mod_level TEXT NOT NULL DEFAULT 'none',
  granted_by INTEGER,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
);
```

**mod_level values:**
- `'none'` - Not a mod
- `'read_only'` - Can view users and logs only
- `'full'` - Can grant/revoke premium
- `'super_admin'` - Full access (future)

### 2. mod_audit_log
```sql
CREATE TABLE mod_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mod_user_id INTEGER NOT NULL,
  target_user_id INTEGER,
  action_type TEXT NOT NULL,
  action_details TEXT NOT NULL,
  reason TEXT,
  ip_address TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mod_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

**action_type values:**
- `'grant_premium'` - Premium granted to user
- `'revoke_premium'` - Premium revoked from user
- `'view_premium_history'` - Viewed user's premium history
- `'view_user_activity'` - Viewed user details/activity
- `'view_mod_actions'` - Viewed another mod's actions
- `'add_note'` - Added internal note (future)

### 3. premium_overrides
```sql
CREATE TABLE premium_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  source TEXT NOT NULL,
  granted_by_mod_id INTEGER,
  override_reason TEXT,
  premium_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_mod_id) REFERENCES mod_users(user_id) ON DELETE SET NULL
);
```

**source values:**
- `'stripe'` - Premium from Stripe subscription
- `'manual_override'` - Premium granted by mod
- `'access_code'` - Premium from redemption code

---

## How to Add Your First Mod

After creating the tables, manually insert yourself as a mod:

```sql
-- Replace YOUR_USER_ID with your actual user ID from the users table
INSERT INTO mod_users (user_id, mod_level, granted_by, granted_at)
VALUES (YOUR_USER_ID, 'full', NULL, datetime('now'));
```

To find your user ID:
```sql
SELECT id, username, email FROM users WHERE username = 'YOUR_USERNAME';
```

---

## Access the Mod Panel

Once you're added as a mod, navigate to:
- **Dashboard:** `/mod`
- **Users List:** `/mod/users`
- **User Detail:** `/mod/users/:userId`
- **Audit Logs:** `/mod/audit`

The mod panel will automatically appear only if you have mod privileges.

---

## Key Implementation Notes

### Authorization Logic
- **Source of truth:** `mod_level` column (NOT a boolean)
- Every endpoint checks `mod_level` on EVERY request
- No session caching of mod status
- `read_only` mods can view but not modify
- `full` and `super_admin` can grant/revoke premium

### Audit Logging
- **High-signal actions only** (not navigation)
- Logs: grant/revoke premium, view sensitive data
- Does NOT log: page views, list browsing, search
- IP addresses stored but only visible to full/super_admin

### Premium Management
- Uses **explicit semantics**: `grant_premium` / `revoke_premium` (not toggle)
- **Reason field is mandatory** for all premium changes
- MOD-granted premium marked as `source: 'manual_override'`
- **Stripe subscriptions cannot be revoked** by mods (user must cancel via Stripe)
- Premium source tracking prevents accidental conflicts

### Security Boundaries
- **Email PII only** - no IP history, location, or payment details
- Mods CANNOT: change passwords, delete accounts, impersonate users
- Mods CAN: view user stats, check-in history, premium status
- All actions are auditable and permanent

---

## Testing Checklist

1. ✅ Create all three tables in Turso
2. ✅ Add yourself as a mod with `mod_level = 'full'`
3. ✅ Navigate to `/mod` and verify dashboard loads
4. ✅ Search for a user in `/mod/users`
5. ✅ View user detail page
6. ✅ Grant premium to a test user (with reason)
7. ✅ Check `/mod/audit` to confirm action was logged
8. ✅ Revoke premium (only if source is not 'stripe')
9. ✅ Verify reason field is enforced (try without reason)
10. ✅ Log out and verify `/mod` redirects to dashboard

---

## Future Enhancements (Not Implemented Yet)

- User suspension/banning
- Internal notes on user profiles
- Advanced search filters
- Data export tools
- Multi-level mod permissions
- Automated alerts for suspicious activity

---

## Emergency: Remove Mod Access

```sql
-- To remove mod access from a user:
UPDATE mod_users SET mod_level = 'none' WHERE user_id = USER_ID;

-- Or delete entirely:
DELETE FROM mod_users WHERE user_id = USER_ID;
```

Audit logs will remain intact for accountability.
