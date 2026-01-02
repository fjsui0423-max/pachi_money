"use client";

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Household, Transaction, HouseholdMember } from '@/types';
import { TransactionItem } from '@/components/TransactionItem';
import { EntryForm } from '@/components/EntryForm';
import { CalendarView } from '@/components/CalendarView';
import { HistoryView } from '@/components/HistoryView';
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  Plus, LogOut, Users, Wallet, Settings, Trash2, AlertTriangle, 
  List, Calendar as CalendarIcon, NotebookPen, PieChart, History,
  ChevronLeft, ChevronRight, ArrowUpDown, Filter
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

const AnalysisView = dynamic(
  () => import('@/components/AnalysisView').then((mod) => mod.AnalysisView),
  { 
    ssr: false, 
    loading: () => <div className="text-center py-20 text-slate-400">グラフ読み込み中...</div>
  }
);

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const [households, setHouseholds] = useState<Household[]>([]);
  const [currentHousehold, setCurrentHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'analysis' | 'history'>('list');
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  useEffect(() => { checkUser(); }, []);
  
  useEffect(() => { 
    if (currentHousehold) {
      fetchTransactions();
      fetchMembers();
    }
  }, [currentHousehold]);

  // ★追加: ユーザーログイン時に保留中の招待があれば処理する
  useEffect(() => {
    if (user) {
      checkPendingInvite();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      fetchHouseholds(session.user.id);
    }
  };

  // ★追加: 保留中の招待トークンをチェックして参加する関数
  const checkPendingInvite = async () => {
    const pendingToken = localStorage.getItem('pendingInviteToken');
    if (!pendingToken || !user) return;

    try {
      // 1. トークンから家計簿IDを取得 (RPC)
      const { data, error } = await supabase.rpc('get_household_by_token', { lookup_token: pendingToken });
      
      if (error || !data || data.length === 0) {
        console.error("Invalid invite token");
        localStorage.removeItem('pendingInviteToken');
        return;
      }
      
      const householdToJoin = data[0];

      // 2. メンバーに参加
      const { error: joinError } = await supabase
        .from('household_members')
        .insert({
          household_id: householdToJoin.id,
          user_id: user.id,
          role: 'member'
        });

      // エラーが「既に参加済み」以外ならアラート
      if (joinError && joinError.code !== '23505') {
        throw joinError;
      }

      // 3. 成功したらトークン削除 & リスト更新 & 通知
      localStorage.removeItem('pendingInviteToken');
      alert(`グループ「${householdToJoin.name}」に参加しました！`);
      
      // リストを再取得して、参加したグループを選択状態にする
      await fetchHouseholds(user.id);
      
    } catch (err) {
      console.error("Auto join failed:", err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { username: username || '名無し' } }
        });
        if (error) throw error;
        alert('登録完了！ログインします。');
      }
      checkUser();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setHouseholds([]);
    setTransactions([]);
    setMembers([]);
    setCurrentHousehold(null);
  };

  const fetchHouseholds = async (userId: string) => {
    const { data: members } = await supabase
      .from('household_members')
      .select('household_id, households(id, name, invite_token, owner_id)')
      .eq('user_id', userId);

    if (members && members.length > 0) {
      const list = members.map((m: any) => m.households) as Household[];
      setHouseholds(list);
      // ★修正: リスト更新時、もし現在選択中のものがなければ先頭を選ぶが、
      // 参加直後かもしれないので、最新のもの(リストの末尾など)を選ぶロジックも検討できるが、
      // ここでは既存ロジック(現在選択中維持 or 先頭)のままとする。
      setCurrentHousehold((prev) => {
        if (!prev) return list[0];
        const stillExists = list.find(h => h.id === prev.id);
        return stillExists ? stillExists : list[0];
      });
    } else {
      setHouseholds([]);
      setCurrentHousehold(null);
    }
  };

  const fetchMembers = async () => {
    if (!currentHousehold) return;
    const { data } = await supabase
      .from('household_members')
      .select('user_id, role, profiles(username)')
      .eq('household_id', currentHousehold.id);

    if (data) {
      const mems = data as unknown as HouseholdMember[];
      setMembers(mems);
      // メンバーが増減したかもしれないので選択状態をリセット(全員選択)
      // ただしユーザーが意図して絞り込んでいる最中かもしれないので、
      // 「まだ選択されていない新しいメンバーがいれば追加」程度にするのが親切だが、
      // 簡易的に「全員選択」にリセットする (または以前の選択を維持しつつ新規を追加)
      setSelectedMemberIds(mems.map(m => m.user_id));
    }
  };

  const createHousehold = async () => {
    const name = prompt("新しいグループ名を入力してください");
    if (!name || !user) return;
    try {
      const { data: newHousehold, error: hError } = await supabase.from('households').insert({ name, owner_id: user.id }).select().single();
      if (hError) throw hError;
      await supabase.from('household_members').insert({ household_id: newHousehold.id, user_id: user.id });
      await fetchHouseholds(user.id);
    } catch (err) { alert("作成失敗"); }
  };

  const deleteHousehold = async () => {
    if (!currentHousehold || !user) return;
    if (currentHousehold.owner_id !== user.id) {
      alert("削除できるのは作成者のみです。");
      return;
    }
    if (!confirm(`本当に「${currentHousehold.name}」を削除しますか？`)) return;
    try {
      await supabase.from('households').delete().eq('id', currentHousehold.id);
      setIsSettingsOpen(false);
      fetchHouseholds(user.id); 
    } catch (err) { alert('削除失敗'); }
  };

  const fetchTransactions = async () => {
    if (!currentHousehold) return;
    setLoading(true);
    const { data } = await supabase
      .from('transactions')
      .select('*, profiles(username)')
      .eq('household_id', currentHousehold.id);
    
    if (data) setTransactions(data as Transaction[]);
    setLoading(false);
  };

  const openNewForm = () => { setEditingTransaction(null); setIsFormOpen(true); };
  const openEditForm = (t: Transaction) => { setEditingTransaction(t); setIsFormOpen(true); };

  const copyInviteLink = () => {
    if (!currentHousehold?.invite_token) return;
    const url = `${window.location.origin}/invite/${currentHousehold.invite_token}`;
    navigator.clipboard.writeText(url);
    alert('招待URLをコピーしました！');
  };

  const filteredTransactions = useMemo(() => {
    if (selectedMemberIds.length === 0) return [];
    return transactions.filter(t => selectedMemberIds.includes(t.user_id));
  }, [transactions, selectedMemberIds]);

  const monthlyBalance = useMemo(() => {
    const start = startOfMonth(displayMonth);
    const end = endOfMonth(displayMonth);
    return filteredTransactions
      .filter(t => {
        if(!t.date) return false;
        return isWithinInterval(parseISO(t.date), { start, end });
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions, displayMonth]);

  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      switch (sortOrder) {
        case 'date-desc': return b.date.localeCompare(a.date);
        case 'date-asc': return a.date.localeCompare(b.date);
        case 'amount-desc': return b.amount - a.amount;
        case 'amount-asc': return a.amount - b.amount;
        default: return 0;
      }
    });
    return sorted;
  }, [filteredTransactions, sortOrder]);

  const prevMonth = () => setDisplayMonth(subMonths(displayMonth, 1));
  const nextMonth = () => setDisplayMonth(addMonths(displayMonth, 1));

  const toggleMember = (userId: string) => {
    setSelectedMemberIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // --- レンダリング ---
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-slate-800">Pachi-Money</CardTitle>
            <p className="text-center text-sm text-slate-500">パチスロ・投資収支 共有アプリ</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLoginMode && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm font-medium">お名前 (ニックネーム)</label>
                  <Input 
                    type="text" 
                    required 
                    placeholder="例: スロ吉"
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    className="h-12 text-lg" 
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">メールアドレス</label>
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="h-12 text-lg" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">パスワード</label>
                <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="h-12 text-lg" />
              </div>
              <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={authLoading}>
                {authLoading ? '処理中...' : (isLoginMode ? 'ログイン' : '新規登録')}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-sm text-blue-600 hover:underline p-2">
                {isLoginMode ? 'アカウント作成はこちら' : 'ログインはこちら'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 safe-area-padding">
      <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
          <Wallet className="w-6 h-6 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <select 
              className="font-bold text-lg bg-transparent outline-none truncate w-full cursor-pointer py-1"
              value={currentHousehold?.id || ''}
              onChange={(e) => {
                if (e.target.value === 'CREATE_NEW') { createHousehold(); return; }
                const selected = households.find(h => h.id === e.target.value);
                setCurrentHousehold(selected || null);
              }}
            >
              {households.length === 0 && <option>グループなし</option>}
              {households.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              <option disabled>──────────</option>
              <option value="CREATE_NEW" className="text-blue-600 font-bold">＋ 新規作成...</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {currentHousehold && (
            <>
              <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="h-10 w-10">
                <Settings className="w-6 h-6 text-slate-600" />
              </Button>
              <Button variant="ghost" size="icon" onClick={openNewForm} className="h-10 w-10">
                <NotebookPen className="w-6 h-6 text-blue-600" />
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {households.length === 0 && (
          <div className="text-center py-20 px-4">
            <Wallet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="mb-6 text-slate-500 font-bold">まだ家計簿がありません</p>
            <Button onClick={createHousehold} className="w-full h-12 text-lg">最初のグループを作る</Button>
            <Button variant="ghost" onClick={handleLogout} className="mt-4 text-slate-400">ログアウト</Button>
          </div>
        )}

        {currentHousehold && (
          <>
            {viewMode !== 'history' && (
              <Card className="bg-slate-900 text-white shadow-lg border-none overflow-hidden relative">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex justify-between items-center mb-2 relative z-10">
                    <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10">
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <span className="font-bold text-lg tracking-widest">
                      {format(displayMonth, 'yyyy.MM', { locale: ja })}
                    </span>
                    <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="flex justify-center items-baseline gap-1 relative z-10">
                    <h2 className={`text-4xl sm:text-5xl font-mono font-bold tracking-tight ${monthlyBalance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {monthlyBalance >= 0 ? '+' : ''}{monthlyBalance.toLocaleString()}
                    </h2>
                  </div>

                  <div className="text-center mt-2 relative z-10">
                    <Button 
                      variant="ghost" size="sm" 
                      className="h-6 text-[10px] text-white bg-white/10 hover:bg-white/20 rounded-full px-3"
                      onClick={copyInviteLink}
                    >
                      <Users className="w-3 h-3 mr-1" /> 招待リンク
                    </Button>
                  </div>
                  
                  <div className="absolute right-[-20px] bottom-[-40px] opacity-10 pointer-events-none">
                    <Wallet className="w-48 h-48" />
                  </div>
                </CardContent>
              </Card>
            )}

            {members.length > 1 && (
              <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 overflow-x-auto">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1 px-1">
                  <Filter className="w-3 h-3" /> 表示対象:
                </div>
                <div className="flex gap-2">
                  {members.map(member => {
                    const isSelected = selectedMemberIds.includes(member.user_id);
                    return (
                      <button
                        key={member.user_id}
                        onClick={() => toggleMember(member.user_id)}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border
                          ${isSelected 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}
                        `}
                      >
                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-300'}`} />
                        {member.profiles?.username || '名無し'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="bg-slate-200 p-1 rounded-lg flex mb-4 overflow-x-auto">
              {[
                { id: 'list', label: 'リスト', icon: List },
                { id: 'calendar', label: '暦', icon: CalendarIcon },
                { id: 'analysis', label: '分析', icon: PieChart },
                { id: 'history', label: '履歴', icon: History },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id as any)}
                  className={`flex-1 flex flex-col sm:flex-row items-center justify-center py-2 px-1 text-[10px] sm:text-xs font-bold rounded-md transition-all ${
                    viewMode === tab.id ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mb-1 sm:mb-0 sm:mr-1" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {viewMode === 'list' ? (
              <div className="pb-4">
                <div className="flex justify-end mb-2">
                  <div className="relative">
                    <ArrowUpDown className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                    <select 
                      className="pl-8 pr-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as any)}
                    >
                      <option value="date-desc">日付: 新しい順</option>
                      <option value="date-asc">日付: 古い順</option>
                      <option value="amount-desc">収支: 勝ち額順</option>
                      <option value="amount-asc">収支: 負け額順</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-2">
                     {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-200 rounded-lg animate-pulse" />)}
                  </div>
                ) : sortedTransactions.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-400 text-sm">表示するデータがありません</p>
                  </div>
                ) : (
                  sortedTransactions.map((t) => (
                    <TransactionItem 
                      key={t.id} 
                      transaction={t} 
                      onClick={openEditForm} 
                    />
                  ))
                )}
              </div>
            ) : viewMode === 'calendar' ? (
              <CalendarView transactions={filteredTransactions} />
            ) : viewMode === 'analysis' ? (
              <AnalysisView transactions={filteredTransactions} />
            ) : (
              <HistoryView transactions={filteredTransactions} />
            )}
          </>
        )}
      </main>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-[90%] rounded-xl">
          <DialogHeader>
            <DialogTitle>設定</DialogTitle>
            <DialogDescription>{currentHousehold?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button variant="outline" className="w-full justify-start h-12" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> ログアウト
            </Button>
            <div className="border-t pt-4 mt-4">
              <Button variant="destructive" className="w-full justify-start h-12" onClick={deleteHousehold}>
                <Trash2 className="w-4 h-4 mr-2" /> グループ削除
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EntryForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchTransactions}
        householdId={currentHousehold?.id}
        initialData={editingTransaction}
      />
    </div>
  );
}