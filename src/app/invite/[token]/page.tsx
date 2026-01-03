"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // next/navigationを使用
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users } from 'lucide-react';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  // URLから招待トークンを取得
  const token = params.token as string;

  const [householdName, setHouseholdName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // ★重要: ページを開いた時点で、このトークンをブラウザに保存しておく
    if (token) {
      localStorage.setItem('pendingInviteToken', token);
    }

    checkInviteAndUser();
  }, [token]);

  const checkInviteAndUser = async () => {
    try {
      // 1. 招待トークンが有効かチェックしてグループ名を取得
      const { data, error } = await supabase.rpc('get_household_by_token', { lookup_token: token });
      
      if (error || !data || data.length === 0) {
        localStorage.removeItem('pendingInviteToken'); // 無効なら消す
        alert('この招待リンクは無効か、期限切れです。');
        router.push('/');
        return;
      }
      
      setHouseholdName(data[0].name);

      // 2. 現在ログインしているか確認
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrRegister = async () => {
    if (!user) {
      // A. 未ログインの場合
      // トークンはlocalStorageに保存済みなので、そのままトップページ（登録画面）へ送る
      // → 登録完了後に page.tsx がトークンを検知して自動参加させる
      router.push('/'); 
    } else {
      // B. ログイン済みの場合
      // その場で参加処理を実行
      try {
        const { data: householdData } = await supabase.rpc('get_household_by_token', { lookup_token: token });
        if (!householdData || householdData.length === 0) return;

        const { error } = await supabase.from('household_members').insert({
          household_id: householdData[0].id,
          user_id: user.id,
          role: 'member'
        });

        if (error && error.code !== '23505') { // 23505 = 既に参加済みエラーは無視
           throw error;
        }

        localStorage.removeItem('pendingInviteToken'); // 参加完了したら消す
        alert(`グループ「${householdName}」に参加しました！`);
        router.push('/'); // メイン画面へ
      } catch (err) {
        alert('参加に失敗しました。');
        console.error(err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-1">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-center text-xl">グループへの招待</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div>
            <p className="text-slate-500 text-sm mb-2">以下のグループに招待されています</p>
            <p className="text-2xl font-bold text-slate-800 py-2 border-y border-slate-100 bg-slate-50/50">
              {householdName}
            </p>
          </div>
          
          <Button 
            onClick={handleJoinOrRegister} 
            className="w-full h-12 text-lg font-bold shadow-md shadow-blue-100"
          >
            {user ? 'このグループに参加する' : 'ログイン・登録して参加'}
          </Button>
          
          
        </CardContent>
      </Card>
    </div>
  );
}