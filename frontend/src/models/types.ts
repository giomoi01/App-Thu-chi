export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  note?: string;
  account_id?: number;
  created_at: string;
}

export interface Budget {
  id: number;
  category: string;
  limit_amount: number;
  month: string; // YYYY-MM
  created_at: string;
}

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string; // YYYY-MM-DD
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface Category {
  id: number;
  type: 'income' | 'expense';
  parent_id: number | null;
  name: string;
  icon: string | null;
  is_default: boolean;
  user_id?: number;
  is_deleted?: boolean;
  created_at: string;
}

export interface Account {
  id: number;
  name: string;
  icon: string | null;
  balance: number;
  is_default: boolean;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  google_id?: string;
  facebook_id?: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

