// MOD System Type Definitions
// Phase 1: Read-only + Premium Grant/Revoke

export type ModLevel = 'none' | 'read_only' | 'full' | 'super_admin';

export type PremiumSource = 'stripe' | 'manual_override' | 'access_code';

export type ModActionType = 
  | 'grant_premium'
  | 'revoke_premium'
  | 'view_premium_history'
  | 'view_user_activity'
  | 'view_mod_actions'
  | 'add_note';

export interface ModUser {
  user_id: number;
  mod_level: ModLevel;
  granted_by: number | null;
  granted_at: string;
}

export interface ModAuditLog {
  id: number;
  mod_user_id: number;
  target_user_id: number | null;
  action_type: ModActionType;
  action_details: string; // JSON string
  reason: string | null;
  ip_address: string | null;
  timestamp: string;
}

export interface PremiumOverride {
  user_id: number;
  source: PremiumSource;
  granted_by_mod_id: number | null;
  override_reason: string | null;
  premium_until: string | null;
  created_at: string;
}

export interface UserListItem {
  id: number;
  username: string;
  email: string | null;
  created_at: string;
  subscription_tier: string;
  premium_until: string | null;
  premium_source: PremiumSource | null;
}

export interface UserDetail extends UserListItem {
  clerk_id: string | null;
  total_checkins: number;
  total_cycles: number;
  last_checkin_date: string | null;
  account_age_days: number;
}

export interface ModActionDetails {
  before?: any;
  after?: any;
  reason: string;
  [key: string]: any;
}
