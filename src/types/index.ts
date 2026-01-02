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
  // ★追加: 紐づくユーザー情報 (結合して取得するため)
  profiles?: {
    username: string;
  };
};

// ★追加: グループメンバー一覧用
export type HouseholdMember = {
  user_id: string;
  profiles: {
    username: string;
  };
  role: string;
};