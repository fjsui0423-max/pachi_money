"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Users, CheckCircle, AlertCircle } from 'lucide-react';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<any>(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  const token = params.token as string;

  useEffect(() => {
    checkUserAndInvite();
  }, [token]);

  const checkUserAndInvite = async () => {
    // 1. ログインユーザー確認
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);

    // 2. トークンから家計簿情報を検索
    const { data, error } = await supabase
      .from('households')
      .select('id, name, owner_id')
      .eq('invite_token', token)
      .single();

    if (error || !data) {
      setError('招待リンクが無効か、有効期限切れです。');
    } else {
      setHousehold(data);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!user) {
      // 未ログインならトップへ飛ばす（本来はログイン後にリダイレクトさせるのが親切ですが今回は簡易実装）
      alert('参加するにはログインが必要です。トップページへ移動します。');
      router.push('/');
      return;
    }

    try {
      setLoading(true);
      // メンバーに追加
      const { error } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: 'member'
        });

      if (error) {
        // すでにメンバーの場合のエラーコード: 23505 (unique_violation)
        if (error.code === '23505') {
          alert('すでにこのグループに参加しています。');
        } else {
          throw error;
        }
      } else {
        alert(`${household.name} に参加しました！`);
      }
      
      // トップページへ戻る
      router.push('/');
    } catch (err) {
      console.error(err);
      alert('参加に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl text-center">
        <CardHeader>
          <div className="mx-auto bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-xl">グループ招待</CardTitle>
          <CardDescription>以下のグループへの招待が届いています</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error ? (
            <div className="text-red-500 bg-red-50 p-4 rounded-lg flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-500 mb-1">グループ名</p>
                <h2 className="text-2xl font-bold text-slate-800">{household.name}</h2>
              </div>

              {!user ? (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                  ※ 参加するにはログインが必要です
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
                  <CheckCircle className="w-4 h-4" />
                  ログイン中: {user.email}
                </div>
              )}

              <Button 
                onClick={handleJoin} 
                className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700"
                disabled={!user} // 未ログイン時は押せない（トップへ誘導）
              >
                参加する
              </Button>
              
              {!user && (
                <Button variant="link" onClick={() => router.push('/')}>
                  ログイン画面へ戻る
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}