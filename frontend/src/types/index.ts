export type UrgencyLevel = 'expired' | 'today' | 'this_week' | 'fresh';

export type ItemCategory =
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'seafood'
  | 'bakery'
  | 'frozen'
  | 'canned'
  | 'dry_goods'
  | 'beverages'
  | 'condiments'
  | 'snacks'
  | 'other';

export interface User {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
}

export interface PantryItem {
  id: string;
  household_id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  unit: string;
  added_date: string;
  expiry_date: string;
  added_by: string;
  notes?: string;
  urgency: UrgencyLevel;
}

export interface ItemCreate {
  name: string;
  category: ItemCategory;
  quantity: number;
  unit: string;
  expiry_date: string;
  notes?: string;
}

export interface Household {
  id: string;
  name: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  user_id: string;
  username: string;
  email: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface Recipe {
  id: string;
  name: string;
  thumbnail?: string;
  category?: string;
  instructions?: string;
  ingredients: string[];
  source_url?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface GroupedItems {
  expired: PantryItem[];
  today: PantryItem[];
  this_week: PantryItem[];
  fresh: PantryItem[];
}

export interface InviteLinkResponse {
  invite_token: string;
  invite_url: string;
  expires_at?: string;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  days_before_expiry: number;
}
