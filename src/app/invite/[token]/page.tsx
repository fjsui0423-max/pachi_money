
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Users, CheckCircle, AlertCircle, LogIn } from 'lucide-react';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<any>(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  const token = params.token as string;

  useEffect(() => {
    // ★追加: アクセス時にトークンをブラウザに一時保存
    if (token) {
      localStorage.setItem('pendingInviteToken', token);
    }
    checkUserAndInvite();
  }, [token]);

  const checkUserAndInvite = async () => {
    // 1. ログインユーザー確認
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);

    // 2. トークンから家計簿情報を検索 (RPCを使用)
    const { data, error } = await supabase
      .rpc('get_household_by_token', { lookup_token: token });

    if (error || !data || data.length === 0) {
      console.error(error);
      setError('招待リンクが無効か、有効期限切れです。');
      // 無効な場合は保存したトークンも消しておく
      localStorage.removeItem('pendingInviteToken');
    } else {
      setHousehold(data[0]);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!user) {
      // 未ログインの場合、トップページへ誘導（トークンはlocalStorageにあるので安心）
      router.push('/');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: 'member'
        });

      if (error) {
        if (error.code === '23505') {
          alert('すでにこのグループに参加しています。');
        } else {
          throw error;
        }
      } else {
        alert(`${household.name} に参加しました！`);
        // 参加完了したのでトークンを削除
        localStorage.removeItem('pendingInviteToken');
      }
      
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
                <h2 className="text-2xl font-bold text-slate-800">{household?.name}</h2>
              </div>

              {!user ? (
                <div className="space-y-4">
                   <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                    参加するにはログインまたは新規登録が必要です
                  </div>
                  {/* 未ログイン時のボタン */}
                  <Button 
                    onClick={() => router.push('/')} 
                    className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    ログイン / 新規登録へ
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
                    <CheckCircle className="w-4 h-4" />
                    ログイン中: {user.email}
                  </div>
                  <Button 
                    onClick={handleJoin} 
                    className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700"
                  >
                    参加する
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}