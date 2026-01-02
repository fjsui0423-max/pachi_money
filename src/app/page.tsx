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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch'; // もしSwitchがない場合はCheckboxでも可
import { 
  Plus, LogOut, Users, Wallet, Settings, Trash2, AlertTriangle, 
  List, Calendar as CalendarIcon, NotebookPen, PieChart, History,
  ChevronLeft, ChevronRight, ArrowUpDown, Filter, Save, Lock
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
  // --- 認証ステート ---
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // --- データステート ---
  const [households, setHouseholds] = useState<Household[]>([]);
  const [currentHousehold, setCurrentHousehold] = useState<Household | null>(null);
  
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // --- UIステート ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'analysis' | 'history'>('list');
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // --- 設定編集用ステート ---
  const [editGroupName, setEditGroupName] = useState('');
  const [isEditRestricted, setIsEditRestricted] = useState(false);

  useEffect(() => { checkUser(); }, []);
  
  useEffect(() => { 
    if (currentHousehold) {
      fetchTransactions();
      fetchMembers();
      // 設定用ステートの初期化
      setEditGroupName(currentHousehold.name);
      setIsEditRestricted(currentHousehold.is_edit_restricted || false);
    }
  }, [currentHousehold]);

  useEffect(() => {
    if (user) checkPendingInvite();
  }, [user]);

  // --- API / Logic ---

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      fetchHouseholds(session.user.id);
    }
  };

  const checkPendingInvite = async () => {
    const pendingToken = localStorage.getItem('pendingInviteToken');
    if (!pendingToken || !user) return;
    try {
      const { data, error } = await supabase.rpc('get_household_by_token', { lookup_token: pendingToken });
      if (error || !data || data.length === 0) {
        localStorage.removeItem('pendingInviteToken');
        return;
      }
      const householdToJoin = data[0];
      const { error: joinError } = await supabase.from('household_members').insert({
          household_id: householdToJoin.id,
          user_id: user.id,
          role: 'member'
        });
      if (joinError && joinError.code !== '23505') throw joinError;
      localStorage.removeItem('pendingInviteToken');
      alert(`グループ「${householdToJoin.name}」に参加しました！`);
      await fetchHouseholds(user.id);
    } catch (err) { console.error(err); }
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
          email, password, options: { data: { username: username || '名無し' } }
        });
        if (error) throw error;
        alert('登録完了！ログインします。');
      }
      checkUser();
    } catch (err: any) { alert(err.message); } finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setHouseholds([]); setTransactions([]); setMembers([]); setCurrentHousehold(null);
  };

  const fetchHouseholds = async (userId: string) => {
    const { data: members } = await supabase
      .from('household_members')
      .select('household_id, households(id, name, invite_token, owner_id, is_edit_restricted)')
      .eq('user_id', userId);

    if (members && members.length > 0) {
      const list = members.map((m: any) => m.households) as Household[];
      setHouseholds(list);
      setCurrentHousehold((prev) => {
        if (!prev) return list[0];
        const stillExists = list.find(h => h.id === prev.id);
        return stillExists ? stillExists : list[0]; // 情報を更新するために新しいオブジェクトを選択
      });
    } else {
      setHouseholds([]); setCurrentHousehold(null);
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
      // メンバー増減時のリセット等は任意（ここでは維持するが、初回のみ全員選択）
      if (selectedMemberIds.length === 0) setSelectedMemberIds(mems.map(m => m.user_id));
    }
  };

  const createHousehold = async () => {
    const name = prompt("新しいグループ名を入力してください");
    if (!name || !user) return;
    try {
      const { data: newHousehold, error: hError } = await supabase.from('households')
        .insert({ name, owner_id: user.id, is_edit_restricted: false }).select().single(); // デフォルトは誰でも編集可
      if (hError) throw hError;
      await supabase.from('household_members').insert({ household_id: newHousehold.id, user_id: user.id });
      await fetchHouseholds(user.id);
    } catch (err) { alert("作成失敗"); }
  };

  // ★グループ情報の更新 (名前変更・権限設定)
  const updateHousehold = async () => {
    if (!currentHousehold || !user) return;
    
    // 権限チェック
    const isOwner = currentHousehold.owner_id === user.id;
    if (!isOwner && currentHousehold.is_edit_restricted) {
      alert("オーナーの設定により、グループ名の変更は許可されていません。");
      return;
    }

    try {
      const { error } = await supabase
        .from('households')
        .update({ 
          name: editGroupName,
          // 権限設定はオーナーのみ変更可能
          is_edit_restricted: isOwner ? isEditRestricted : currentHousehold.is_edit_restricted 
        })
        .eq('id', currentHousehold.id);

      if (error) throw error;
      alert("設定を更新しました");
      fetchHouseholds(user.id); // 最新情報を再取得
      setIsSettingsOpen(false);
    } catch (err) {
      alert("更新に失敗しました");
    }
  };

  const deleteHousehold = async () => {
    if (!currentHousehold || !user) return;
    if (currentHousehold.owner_id !== user.id) {
      alert("削除できるのは作成者のみです。\n参加者は削除できません。");
      return;
    }
    if (!confirm(`本当に「${currentHousehold.name}」を削除しますか？\n他のメンバーのデータはバックアップされます。`)) return;

    try {
      setLoading(true);
      // 他メンバーの救済処理
      const { data: members } = await supabase.from('household_members').select('user_id').eq('household_id', currentHousehold.id).neq('user_id', user.id);
      if (members) {
        for (const m of members) {
          const { data: backup } = await supabase.from('households').insert({ name: `${currentHousehold.name} (Backup)`, owner_id: m.user_id }).select().single();
          if (backup) {
             await supabase.from('household_members').insert({ household_id: backup.id, user_id: m.user_id, role: 'owner' });
             await supabase.from('transactions').update({ household_id: backup.id }).eq('household_id', currentHousehold.id).eq('user_id', m.user_id);
          }
        }
      }
      await supabase.from('households').delete().eq('id', currentHousehold.id);
      setIsSettingsOpen(false);
      fetchHouseholds(user.id); 
    } catch (err) { alert('削除失敗'); } finally { setLoading(false); }
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

  // --- Filter & Sort Logic ---
  const filteredTransactions = useMemo(() => {
    if (selectedMemberIds.length === 0) return [];
    return transactions.filter(t => selectedMemberIds.includes(t.user_id));
  }, [transactions, selectedMemberIds]);

  const monthlyBalance = useMemo(() => {
    const start = startOfMonth(displayMonth);
    const end = endOfMonth(displayMonth);
    return filteredTransactions
      .filter(t => t.date && isWithinInterval(parseISO(t.date), { start, end }))
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
    setSelectedMemberIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  // --- Rendering ---
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
                  <Input type="text" required placeholder="例: スロ吉" value={username} onChange={e => setUsername(e.target.value)} className="h-12 text-lg" />
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

  const isOwner = currentHousehold?.owner_id === user.id;

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
                          ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}
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
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-200 rounded-lg animate-pulse" />)}</div>
                ) : sortedTransactions.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-400 text-sm">表示するデータがありません</p>
                  </div>
                ) : (
                  sortedTransactions.map((t) => (
                    <TransactionItem key={t.id} transaction={t} onClick={openEditForm} />
                  ))
                )}
              </div>
            ) : viewMode === 'calendar' ? (
              // ★修正: 編集用関数を渡す
              <CalendarView transactions={filteredTransactions} onSelectTransaction={openEditForm} />
            ) : viewMode === 'analysis' ? (
              <AnalysisView transactions={filteredTransactions} />
            ) : (
              <HistoryView transactions={filteredTransactions} />
            )}
          </>
        )}
      </main>

      {/* 設定モーダル */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-[90%] rounded-xl">
          <DialogHeader>
            <DialogTitle>グループ設定</DialogTitle>
            <DialogDescription>ID: {currentHousehold?.id.slice(0, 8)}...</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* 1. グループ名・権限設定 */}
            <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
              <div className="space-y-2">
                <Label>グループ名</Label>
                <div className="flex gap-2">
                  <Input 
                    value={editGroupName} 
                    onChange={e => setEditGroupName(e.target.value)} 
                    disabled={!isOwner && currentHousehold?.is_edit_restricted}
                  />
                  <Button onClick={updateHousehold} disabled={!isOwner && currentHousehold?.is_edit_restricted}>
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
                {!isOwner && currentHousehold?.is_edit_restricted && (
                  <p className="text-xs text-red-500">※ オーナーにより編集が制限されています</p>
                )}
              </div>

              {/* オーナーのみ表示される権限スイッチ */}
              {isOwner && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <Lock className="w-4 h-4" /> 編集制限
                    </Label>
                    <p className="text-xs text-slate-500">メンバーによるグループ名の変更を禁止する</p>
                  </div>
                  {/* SwitchがなければCheckboxで代用可 */}
                  <input 
                    type="checkbox" 
                    className="w-5 h-5"
                    checked={isEditRestricted}
                    onChange={e => setIsEditRestricted(e.target.checked)}
                  />
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full justify-start h-12" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> ログアウト
            </Button>
            
            <div className="border-t pt-4">
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