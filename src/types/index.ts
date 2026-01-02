export type Profile = {
  id: string;
  username: string;
  avatar_url?: string;
};

export type Household = {
  id: string;
  name: string;
  owner_id: string;
  invite_token: string;
  is_edit_restricted: boolean;
};

export type Transaction = {
  id: number;
  created_at: string;
  date: string;
  shop_name: string;
  machine_name: string;
  investment: number;
  recovery: number;
  amount: number;
  type: 'income' | 'expense';
  memo?: string;
  user_id: string;
  profiles?: {
    username: string;
  };
};

export type HouseholdMember = {
  user_id: string;
  profiles: {
    username: string;
  };
  role: string;
};

// ★追加
export type MasterItem = {
  id: number;
  category: 'shop' | 'machine';
  name: string;
};
// ... (他の型定義はそのまま)


// ...