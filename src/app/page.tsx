"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { Household, Transaction, HouseholdMember } from '@/types';
import { TransactionItem } from '@/components/TransactionItem';
import { EntryForm } from '@/components/EntryForm';
import { CalendarView } from '@/components/CalendarView';
import { HistoryView } from '@/components/HistoryView';
import { AvatarUpload } from '@/components/AvatarUpload';
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; 
import { 
  LogOut, Users, Wallet, Settings, Trash2,
  Calendar as CalendarIcon, NotebookPen, PieChart, History,
  ChevronLeft, ChevronRight, ArrowUpDown, Filter, Save, Lock, UserCircle, ArrowLeft, X,
  DoorOpen, Mail, UserX, FileUp, Copy, Star // ▼ 追加: Starアイコン
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfYear, endOfYear, getYear } from 'date-fns';
import { ja } from 'date-fns/locale';

const AnalysisView = dynamic(
  () => import('@/components/AnalysisView').then((mod) => mod.AnalysisView),
  { 
    ssr: false, 
    loading: () => <div className="text-center py-20 text-slate-400">グラフ読み込み中...</div>
  }
);

// Household型を拡張して is_default を持てるようにする
type ExtendedHousehold = Household & { is_default?: boolean };

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  
  const [isEmailSent, setIsEmailSent] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  const [editUsername, setEditUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // ▼ 型を変更
  const [households, setHouseholds] = useState<ExtendedHousehold[]>([]);
  const [currentHousehold, setCurrentHousehold] = useState<ExtendedHousehold | null>(null);
  
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'analysis' | 'history'>('calendar');
  const [viewRange, setViewRange] = useState<'month' | 'year' | 'all'>('month');
  const [displayMonth, setDisplayMonth] = useState(new Date());
  
  const [filterCondition, setFilterCondition] = useState<{ type: 'shop' | 'machine' | null, value: string }>({ type: null, value: '' });
  
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'shop-asc' | 'machine-asc'>('date-desc');

  const [editGroupName, setEditGroupName] = useState('');
  const [isEditRestricted, setIsEditRestricted] = useState(false);

  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copyTargetHouseholdId, setCopyTargetHouseholdId] = useState<string>('');
  const [copyRange, setCopyRange] = useState<'all' | 'year' | 'month'>('all');
  const [copyYear, setCopyYear] = useState<string>(new Date().getFullYear().toString());
  const [copyMonth, setCopyMonth] = useState<string>((new Date().getMonth() + 1).toString());

  useEffect(() => { checkUser(); }, []);
  
  useEffect(() => { 
    if (currentHousehold) {
      fetchTransactions();
      fetchMembers();
      setEditGroupName(currentHousehold.name);
      setIsEditRestricted(currentHousehold.is_edit_restricted || false);
    }
  }, [currentHousehold]);

  useEffect(() => {
    if (user) {
      checkPendingInvite();
      getProfile();
    }
  }, [user]);

  const availableYearsForCopy = useMemo(() => {
    const years = new Set(transactions.map(t => getYear(parseISO(t.date))));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      fetchHouseholds(session.user.id);
    }
  };

  const getProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error, status } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
      if (error && status !== 406) throw error;
      if (data) { setProfile(data); setEditUsername(data.username); setAvatarUrl(data.avatar_url); }
    } catch (error) { console.log('Error loading user data!'); }
  };

  const updateProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('profiles').upsert({ id: user.id, username: editUsername, avatar_url: avatarUrl, updated_at: new Date() });
      if (error) throw error;
      alert('プロフィールを更新しました！'); getProfile();
      if (currentHousehold) fetchTransactions(); 
    } catch (error) { alert('更新に失敗しました'); }
  };

  const checkPendingInvite = async () => {
    const pendingToken = localStorage.getItem('pendingInviteToken');
    if (!pendingToken || !user) return;
    try {
      const { data, error } = await supabase.rpc('get_household_by_token', { lookup_token: pendingToken });
      if (error || !data || data.length === 0) { localStorage.removeItem('pendingInviteToken'); return; }
      const householdToJoin = data[0];
      const { error: joinError } = await supabase.from('household_members').insert({ household_id: householdToJoin.id, user_id: user.id, role: 'member' });
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
        checkUser();
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password, 
          options: { 
            data: { username: username || '名無し' } 
          } 
        });
        if (error) throw error;
        setIsEmailSent(true);
      }
    } catch (err: any) { 
      alert(err.message); 
    } finally { 
      setAuthLoading(false); 
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setHouseholds([]); setTransactions([]); setMembers([]); setCurrentHousehold(null);
  };

  const deleteAccount = async () => {
    if (!user) return;
    if (!confirm("【重要】アカウントを削除しますか？\n\n・全ての収支データが完全に削除されます\n・あなたがオーナーのグループも削除されます\n・この操作は取り消せません")) return;
    if (!confirm("最終確認です。本当によろしいですか？")) return;
    try {
      setLoading(true);
      const { error } = await supabase.rpc('delete_own_account');
      if (error) throw error;
      await supabase.auth.signOut();
      setUser(null); setHouseholds([]); setTransactions([]); setIsSettingsOpen(false);
      alert("アカウントを削除しました。ご利用ありがとうございました。");
    } catch (err: any) {
      console.error(err);
      alert("削除に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentHousehold || !user) return;

    if (!confirm("CSVデータをインポートしますか？\n※ 「日付,店舗,機種,投資額,回収額,収支,メモ」の形式に対応しています。\n※ 現在のグループに追加されます。")) {
      e.target.value = '';
      return;
    }

    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          const insertData: any[] = [];
          let errorCount = 0;

          for (const row of rows) {
            if (!row['日付']) {
              continue;
            }

            try {
              const formattedDate = row['日付'].replace(/\//g, '-');
              const investment = parseInt(String(row['投資額'] || '0').replace(/,/g, ''), 10) || 0;
              const recovery = parseInt(String(row['回収額'] || '0').replace(/,/g, ''), 10) || 0;
              let amount = parseInt(String(row['収支'] || '0').replace(/,/g, ''), 10);
              
              if (amount === 0 && (investment !== 0 || recovery !== 0)) {
              }

              insertData.push({
                household_id: currentHousehold.id,
                user_id: user.id,
                date: formattedDate,
                shop_name: row['店舗'] || '',
                machine_name: row['機種'] || '',
                investment: investment,
                recovery: recovery,
                amount: amount,
                type: amount >= 0 ? 'income' : 'expense',
                memo: row['メモ'] || '',
                created_at: new Date().toISOString()
              });

            } catch (rowErr) {
              console.error("行のパースエラー:", row, rowErr);
              errorCount++;
            }
          }

          if (insertData.length === 0) {
            alert("インポートできるデータが見つかりませんでした。\nCSVのヘッダーが「日付,店舗,機種...」となっているか確認してください。");
            return;
          }

          const { error } = await supabase.from('transactions').insert(insertData);
          if (error) throw error;

          alert(`${insertData.length} 件のデータをインポートしました！`);
          setIsSettingsOpen(false);
          fetchTransactions();

        } catch (err: any) {
          console.error(err);
          alert(`インポートに失敗しました: ${err.message}`);
        } finally {
          setLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (err) => {
        console.error(err);
        alert("ファイルの読み込みに失敗しました。");
        setLoading(false);
      }
    });
  };

  const handleCopyData = async () => {
    if (!currentHousehold || !user || !copyTargetHouseholdId) return;
    
    const targetHousehold = households.find(h => h.id === copyTargetHouseholdId);
    if (!targetHousehold) return;

    let rangeMsg = "全期間";
    if (copyRange === 'year') rangeMsg = `${copyYear}年の`;
    if (copyRange === 'month') rangeMsg = `${copyYear}年${copyMonth}月の`;

    if (!confirm(`現在のグループ「${currentHousehold.name}」のデータ（${rangeMsg}）を、\nグループ「${targetHousehold.name}」にコピーしますか？\n\n※ データは追加登録されます（上書きされません）。`)) return;

    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('household_id', currentHousehold.id);

      if (copyRange === 'year') {
        const startDate = `${copyYear}-01-01`;
        const endDate = `${copyYear}-12-31`;
        query = query.gte('date', startDate).lte('date', endDate);
      } else if (copyRange === 'month') {
        const targetDate = new Date(parseInt(copyYear), parseInt(copyMonth) - 1, 1);
        const startDate = format(startOfMonth(targetDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(targetDate), 'yyyy-MM-dd');
        query = query.gte('date', startDate).lte('date', endDate);
      }

      const { data: sourceTransactions, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      if (!sourceTransactions || sourceTransactions.length === 0) {
        alert("指定された期間のコピー元データがありません。");
        return;
      }

      const insertData = sourceTransactions.map(t => ({
        household_id: targetHousehold.id,
        user_id: user.id,
        date: t.date,
        shop_name: t.shop_name,
        machine_name: t.machine_name,
        investment: t.investment,
        recovery: t.recovery,
        amount: t.amount,
        type: t.type,
        memo: t.memo,
        created_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('transactions')
        .insert(insertData);
      
      if (insertError) throw insertError;

      alert(`${insertData.length}件のデータをコピーしました！`);
      setIsSettingsOpen(false);
      setCopyTargetHouseholdId(''); 
      
    } catch (err: any) {
      console.error(err);
      alert(`コピーに失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ▼ 追加: メイングループ設定処理
  const handleSetDefault = async () => {
    if (!currentHousehold || !user) return;
    
    setLoading(true);
    try {
      // RPCを呼び出して、他をfalse、これをtrueにする
      const { error } = await supabase.rpc('set_default_household', { 
        target_household_id: currentHousehold.id 
      });

      if (error) throw error;

      alert(`「${currentHousehold.name}」をメインのグループに設定しました。\n次回ログイン時から最初に表示されます。`);
      
      // グループリストを再取得して並び順を更新
      await fetchHouseholds(user.id);
      
    } catch (err: any) {
      console.error(err);
      alert(`設定に失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ▼ 修正: is_defaultを取得し、並び替えを行う
  const fetchHouseholds = async (userId: string) => {
    const { data: members } = await supabase
      .from('household_members')
      .select('household_id, is_default, households(id, name, invite_token, owner_id, is_edit_restricted)')
      .eq('user_id', userId);

    if (members && members.length > 0) {
      // メイン(is_default=true)が先頭に来るようにソート
      members.sort((a, b) => (b.is_default === true ? 1 : 0) - (a.is_default === true ? 1 : 0));

      const list = members.map((m: any) => ({
        ...m.households,
        is_default: m.is_default // 拡張プロパティとして持たせる
      })) as ExtendedHousehold[];

      setHouseholds(list);
      
      // 初期表示の選択
      setCurrentHousehold(prev => {
        // すでに選択中ならそれを維持、なければリスト先頭（＝メイン）を選択
        if (prev) {
          return list.find(h => h.id === prev.id) || list[0];
        }
        return list[0];
      });
    } else { 
      setHouseholds([]); 
      setCurrentHousehold(null); 
    }
  };

  const fetchTransactions = async () => {
    if (!currentHousehold) return;
    setLoading(true);
    const { data } = await supabase.from('transactions').select('*, profiles(username, avatar_url)').eq('household_id', currentHousehold.id);
    if (data) setTransactions(data as Transaction[]);
    setLoading(false);
  };
  
  const fetchMembers = async () => {
    if (!currentHousehold) return;
    const { data } = await supabase.from('household_members').select('user_id, role, profiles(username)').eq('household_id', currentHousehold.id);
    if (data) {
      const mems = data as unknown as HouseholdMember[];
      setMembers(mems);
      if (selectedMemberIds.length === 0) setSelectedMemberIds(mems.map(m => m.user_id));
    }
  };

  const createHousehold = async () => {
    const name = prompt("新しいグループ名を入力してください");
    if (!name || !user) return;
    try {
      const { data: newHousehold, error: hError } = await supabase.from('households').insert({ name, owner_id: user.id, is_edit_restricted: false }).select().single(); 
      if (hError) throw hError;
      await supabase.from('household_members').insert({ household_id: newHousehold.id, user_id: user.id, is_default: true }); // 作成時はデフォルトにする
      await fetchHouseholds(user.id);
    } catch (err) { alert("作成失敗"); }
  };

  const updateHousehold = async () => {
    if (!currentHousehold || !user) return;
    const isOwner = currentHousehold.owner_id === user.id;
    if (!isOwner && currentHousehold.is_edit_restricted) { alert("オーナーの設定により、グループ名の変更は許可されていません。"); return; }
    try {
      const { error } = await supabase.from('households').update({ name: editGroupName, is_edit_restricted: isOwner ? isEditRestricted : currentHousehold.is_edit_restricted }).eq('id', currentHousehold.id);
      if (error) throw error;
      alert("設定を更新しました"); fetchHouseholds(user.id); setIsSettingsOpen(false);
    } catch (err) { alert("更新に失敗しました"); }
  };

  const deleteHousehold = async () => {
    if (!currentHousehold || !user) return;
    if (currentHousehold.owner_id !== user.id) { alert("削除できるのは作成者のみです。"); return; }
    if (!confirm(`本当に「${currentHousehold.name}」を削除しますか？`)) return;
    try {
      setLoading(true);
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
      await supabase.from('households').delete().eq('id', currentHousehold.id); setIsSettingsOpen(false); fetchHouseholds(user.id); 
    } catch (err) { alert('削除失敗'); } finally { setLoading(false); }
  };

  const leaveHousehold = async () => {
    if (!currentHousehold || !user) return;
    if (currentHousehold.owner_id === user.id) {
      alert("オーナーはグループを退出できません。"); return;
    }
    if (!confirm(`本当に「${currentHousehold.name}」から退出しますか？`)) return;
    try {
      setLoading(true);
      const { error } = await supabase.rpc('leave_household', { target_household_id: currentHousehold.id });
      if (error) throw error;
      alert("グループから退出しました。"); setIsSettingsOpen(false); setCurrentHousehold(null); await fetchHouseholds(user.id);
    } catch (err) { console.error(err); alert('退出処理に失敗しました。'); } finally { setLoading(false); }
  };

  const openNewForm = () => { setEditingTransaction(null); setIsFormOpen(true); };
  const openEditForm = (t: Transaction) => { setEditingTransaction(t); setIsFormOpen(true); };

  const copyInviteLink = () => {
    if (!currentHousehold?.invite_token) return;
    const url = `${window.location.origin}/invite/${currentHousehold.invite_token}`;
    navigator.clipboard.writeText(url); alert('招待URLをコピーしました！');
  };

  const filteredTransactions = useMemo(() => {
    if (selectedMemberIds.length === 0) return [];
    return transactions.filter(t => selectedMemberIds.includes(t.user_id));
  }, [transactions, selectedMemberIds]);

  const displayedTransactions = useMemo(() => {
    let filtered = filteredTransactions;

    if (viewRange !== 'all') {
      let start, end;
      if (viewRange === 'year') {
        start = startOfYear(displayMonth);
        end = endOfYear(displayMonth);
      } else {
        start = startOfMonth(displayMonth);
        end = endOfMonth(displayMonth);
      }
      filtered = filtered.filter(t => t.date && isWithinInterval(parseISO(t.date), { start, end }));
    }

    if (filterCondition.type === 'shop') {
      filtered = filtered.filter(t => t.shop_name === filterCondition.value);
    } else if (filterCondition.type === 'machine') {
      filtered = filtered.filter(t => t.machine_name === filterCondition.value);
    }

    return filtered;
  }, [filteredTransactions, displayMonth, viewRange, filterCondition]);

  const currentBalance = useMemo(() => {
    return displayedTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [displayedTransactions]);

  const sortedTransactions = useMemo(() => {
    const target = viewMode === 'list' ? displayedTransactions : filteredTransactions;
    const sorted = [...target];
    sorted.sort((a, b) => {
      switch (sortOrder) {
        case 'date-desc': return b.date.localeCompare(a.date);
        case 'date-asc': return a.date.localeCompare(b.date);
        case 'amount-desc': return b.amount - a.amount;
        case 'amount-asc': return a.amount - b.amount;
        case 'shop-asc': return (a.shop_name || '').localeCompare(b.shop_name || '', 'ja');
        case 'machine-asc': return (a.machine_name || '').localeCompare(b.machine_name || '', 'ja');
        default: return 0;
      }
    });
    return sorted;
  }, [displayedTransactions, filteredTransactions, viewMode, sortOrder]);

  const prevMonth = () => {
    if (viewMode === 'list' && viewRange === 'year') setDisplayMonth(subMonths(displayMonth, 12));
    else setDisplayMonth(subMonths(displayMonth, 1));
  };
  const nextMonth = () => {
    if (viewMode === 'list' && viewRange === 'year') setDisplayMonth(addMonths(displayMonth, 12));
    else setDisplayMonth(addMonths(displayMonth, 1));
  };

  const toggleMember = (userId: string) => {
    setSelectedMemberIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };
  const isOwner = currentHousehold?.owner_id === user?.id;

  const clearFilter = () => {
    setFilterCondition({ type: null, value: '' });
    if (viewRange === 'all') setViewRange('month'); 
  };

  const handleViewModeChange = (mode: any) => {
    if (mode !== 'list' && filterCondition.type !== null) clearFilter();
    if (mode === 'calendar') setViewRange('month');
    setViewMode(mode);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };
  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextMonth();
    }
    if (isRightSwipe) {
      prevMonth();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 safe-area-padding">
        <header className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-800">
            <Wallet className="w-6 h-6 text-blue-600" />
            Pachi-Money
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8 lg:py-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-center lg:text-left">
              <h1 className="text-3xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                パチンコ・パチスロ収支を<br className="hidden lg:block" />
                <span className="text-blue-600">もっとスマートに管理。</span>
              </h1>
              <p className="text-slate-600 text-lg leading-relaxed">
                Pachi-Moneyは、日々の収支を簡単に記録・分析できる完全無料のクラウド家計簿アプリです。<br />
                友人やパートナーとの「グループ共有」機能で、収支を楽しく可視化しましょう。
              </p>
              
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg shadow-sm border border-slate-100">
                  <CalendarIcon className="w-6 h-6 text-blue-500" />
                  <span className="text-xs font-bold text-slate-600">カレンダー</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg shadow-sm border border-slate-100">
                  <PieChart className="w-6 h-6 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-600">分析グラフ</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg shadow-sm border border-slate-100">
                  <Users className="w-6 h-6 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600">グループ共有</span>
                </div>
              </div>
            </div>

            <div className="w-full max-w-md mx-auto">
              <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-center text-xl font-bold text-slate-800">
                    {isEmailSent ? 'メール送信完了' : (isLoginMode ? 'ログインして始める' : 'アカウント作成')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEmailSent ? (
                    <div className="flex flex-col items-center justify-center space-y-6 py-8 text-center animate-in fade-in slide-in-from-bottom-2">
                      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                        <Mail className="w-10 h-10 text-blue-600" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-slate-800">確認メールを送信しました</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          <span className="font-bold text-slate-800">{email}</span> 宛に<br />
                          確認用のメールをお送りしました。
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg text-xs text-slate-500 text-left w-full space-y-2 border border-slate-100">
                        <p>📩 メール内のリンクをクリックして登録を完了させてください。</p>
                        <p>⚠️ 届かない場合は「迷惑メールフォルダ」もご確認ください。</p>
                      </div>
                      <Button variant="outline" className="w-full mt-2" onClick={() => { setIsEmailSent(false); setIsLoginMode(true); }}>
                        ログイン画面へ戻る
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleAuth} className="space-y-4">
                      {!isLoginMode && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <label className="text-sm font-medium">お名前 (ニックネーム)</label>
                          <Input type="text" required placeholder="例: スロ吉" value={username} onChange={e => setUsername(e.target.value)} className="h-11" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">メールアドレス</label>
                        <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">パスワード</label>
                        <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="h-11" />
                      </div>
                      <Button type="submit" className="w-full h-11 text-lg font-bold shadow-lg shadow-blue-200" disabled={authLoading}>
                        {authLoading ? '処理中...' : (isLoginMode ? 'ログイン' : '無料で登録')}
                      </Button>
                    </form>
                  )}
                  
                  {!isEmailSent && (
                    <div className="mt-6 text-center">
                      <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-sm text-blue-600 hover:underline p-2 font-medium">
                        {isLoginMode ? 'はじめての方はこちら（新規登録）' : 'すでにアカウントをお持ちの方'}
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
              {!isEmailSent && (
                <p className="text-center text-xs text-slate-400 mt-4">
                  登録することで、
                  <Link href="/terms" className="underline hover:text-slate-600">利用規約</Link>
                  と
                  <Link href="/privacy" className="underline hover:text-slate-600">プライバシーポリシー</Link>
                  に同意したものとみなされます。
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const getHeaderDateLabel = () => {
    if (viewRange === 'all') return '全期間';
    if (viewRange === 'year') return format(displayMonth, 'yyyy年', { locale: ja });
    return format(displayMonth, 'yyyy年 M月', { locale: ja });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32 safe-area-padding">
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
            {members.length > 1 && (
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-100 flex items-center gap-3 overflow-hidden">
                <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {members.map(member => {
                    const isSelected = selectedMemberIds.includes(member.user_id);
                    return (
                      <button
                        key={member.user_id}
                        onClick={() => toggleMember(member.user_id)}
                        className={`
                          flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-all border whitespace-nowrap
                          ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}
                        `}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-300'}`} />
                        {member.profiles?.username || '名無し'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {viewMode === 'calendar' ? (
              <div className="space-y-4">
                <div 
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  <div className="bg-slate-50/50 border-b border-slate-100 px-3 py-2 flex justify-between items-center">
                    <div className="flex items-center gap-1">
                       <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7 text-slate-400 hover:text-slate-600">
                        <ChevronLeft className="w-4 h-4" />
                       </Button>
                       <span className="font-bold text-slate-700 text-base">
                         {getHeaderDateLabel()}
                       </span>
                       <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7 text-slate-400 hover:text-slate-600">
                        <ChevronRight className="w-4 h-4" />
                       </Button>
                    </div>
                    <div className={`text-xl font-mono font-bold tracking-tight ${currentBalance >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {currentBalance >= 0 ? '+' : ''}{currentBalance.toLocaleString()}
                    </div>
                  </div>
                  <CalendarView transactions={filteredTransactions} onSelectTransaction={openEditForm} currentDate={displayMonth} />
                </div>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 mb-2">
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => handleViewModeChange('history')} className="gap-1 h-8 text-xs">
                      <ArrowLeft className="w-3 h-3" /> 履歴へ
                    </Button>
                    <span className="text-sm font-bold text-slate-500">
                      {getHeaderDateLabel()}
                    </span>
                  </div>

                  {filterCondition.type && (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-800">フィルタ中:</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-blue-100 text-blue-600 font-bold">
                          {filterCondition.type === 'machine' ? '機種' : '店舗'}: {filterCondition.value}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-400 hover:text-blue-600 hover:bg-blue-100" onClick={clearFilter}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mb-2">
                  <div className="relative">
                    <ArrowUpDown className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-500" />
                    <select 
                      className="pl-7 pr-2 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as any)}
                    >
                      <option value="date-desc">日付: 新しい順</option>
                      <option value="date-asc">日付: 古い順</option>
                      <option value="amount-desc">収支: 勝ち額順</option>
                      <option value="amount-asc">収支: 負け額順</option>
                      <option value="shop-asc">店舗: 五十音順</option>
                      <option value="machine-asc">機種: 五十音順</option>
                    </select>
                  </div>
                </div>
                {loading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-200 rounded-lg animate-pulse" />)}</div>
                ) : sortedTransactions.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-400 text-sm">データがありません</p>
                  </div>
                ) : (
                  sortedTransactions.map((t) => (
                    <TransactionItem key={t.id} transaction={t} onClick={openEditForm} />
                  ))
                )}
              </div>
            ) : viewMode === 'analysis' ? (
              <AnalysisView 
                transactions={filteredTransactions} 
                onSelectMachine={(name) => {
                  setFilterCondition({ type: 'machine', value: name });
                  setViewRange('all');
                  setViewMode('list');
                }}
                onSelectShop={(name) => {
                  setFilterCondition({ type: 'shop', value: name });
                  setViewRange('all');
                  setViewMode('list');
                }}
              />
            ) : (
              <HistoryView 
                transactions={filteredTransactions} 
                onSelectMonth={(date) => {
                  setDisplayMonth(date);
                  setViewRange('month'); 
                  setViewMode('list');
                }}
                onSelectYear={(date) => {
                  setDisplayMonth(date);
                  setViewRange('year'); 
                  setViewMode('list');
                }}
              />
            )}

            <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50">
               <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-slate-200/60 flex justify-around items-center">
                {[
                  { id: 'calendar', label: 'カレンダー', icon: CalendarIcon },
                  { id: 'analysis', label: '分析', icon: PieChart },
                  { id: 'history', label: '履歴', icon: History },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleViewModeChange(tab.id)}
                    className={`
                      flex flex-col items-center justify-center w-full py-2 rounded-xl transition-all duration-200
                      ${viewMode === tab.id 
                        ? 'text-blue-600 bg-blue-50 scale-105 font-bold shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }
                    `}
                  >
                    <tab.icon className={`w-5 h-5 mb-1 ${viewMode === tab.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    <span className="text-[10px]">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-[90%] rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>設定</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4 border p-4 rounded-lg bg-blue-50/50">
              <Label className="flex items-center gap-2 text-base text-blue-800">
                <UserCircle className="w-5 h-5" /> アカウント設定
              </Label>
              <AvatarUpload 
                url={avatarUrl} 
                onUpload={(url) => { setAvatarUrl(url); }}
              />
              <div className="space-y-2">
                <Label>ユーザー名</Label>
                <div className="flex gap-2">
                  <Input value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="ユーザー名を入力" className="bg-white" />
                  <Button onClick={updateProfile}><Save className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>

            <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
               <Label className="flex items-center gap-2 text-base text-slate-800">
                <Settings className="w-5 h-5" /> グループ設定
              </Label>
              <div className="space-y-2">
                <Label>グループ名</Label>
                <div className="flex gap-2">
                  <Input 
                    value={editGroupName} 
                    onChange={e => setEditGroupName(e.target.value)} 
                    disabled={!isOwner && currentHousehold?.is_edit_restricted}
                    className="bg-white"
                  />
                  <Button onClick={updateHousehold} disabled={!isOwner && currentHousehold?.is_edit_restricted}>
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
                {!isOwner && currentHousehold?.is_edit_restricted && (
                  <p className="text-xs text-red-500">※ オーナーにより編集が制限されています</p>
                )}
              </div>
              
              {/* ▼ メイングループ設定ボタン */}
              {currentHousehold && (
                <div className="pt-2">
                  {currentHousehold.is_default ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-orange-500 font-bold bg-orange-50 p-2 rounded">
                      <Star className="w-4 h-4 fill-orange-500" /> 現在メインのグループです
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full text-slate-600 hover:text-orange-600 hover:bg-orange-50 border-dashed"
                      onClick={handleSetDefault}
                    >
                      <Star className="w-4 h-4 mr-2" /> このグループをメインにする
                    </Button>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1 text-center">
                    ログイン時に最初に表示されます
                  </p>
                </div>
              )}

              {isOwner && (
                <div className="flex items-center justify-between border-t pt-4 mt-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm flex items-center gap-2">
                      <Lock className="w-4 h-4" /> 編集制限
                    </Label>
                    <p className="text-xs text-slate-500">メンバーによるグループ名の変更を禁止</p>
                  </div>
                  <Switch checked={isEditRestricted} onCheckedChange={setIsEditRestricted} />
                </div>
              )}
              <div className="pt-2 text-center">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-blue-600" onClick={copyInviteLink}>
                  <Users className="w-3 h-3 mr-1" /> 招待リンクをコピー
                </Button>
              </div>

              {/* CSVインポート機能 */}
              <div className="border-t pt-4 mt-4">
                <Label className="flex items-center gap-2 mb-2 text-slate-700">
                  <FileUp className="w-4 h-4" /> データインポート
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-slate-600 hover:text-blue-600"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    CSVファイルを読み込む
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 pl-1">
                  ※ 現在選択中のグループに追加されます。
                </p>
              </div>

              {/* データコピー機能 */}
              <div className="border-t pt-4 mt-4">
                <Label className="flex items-center gap-2 mb-2 text-slate-700">
                  <Copy className="w-4 h-4" /> データを別のグループへコピー
                </Label>
                <div className="space-y-3">
                  
                  <div className="grid grid-cols-2 gap-2">
                     <Select 
                       value={copyTargetHouseholdId}
                       onValueChange={setCopyTargetHouseholdId}
                     >
                       <SelectTrigger className="w-full text-xs">
                         <SelectValue placeholder="コピー先..." />
                       </SelectTrigger>
                       <SelectContent>
                         {households
                           .filter(h => h.id !== currentHousehold?.id)
                           .map(h => (
                             <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                           ))
                         }
                       </SelectContent>
                     </Select>

                     <Select 
                       value={copyRange}
                       onValueChange={(val: any) => setCopyRange(val)}
                     >
                       <SelectTrigger className="w-full text-xs">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">全期間</SelectItem>
                         <SelectItem value="year">年単位</SelectItem>
                         <SelectItem value="month">月単位</SelectItem>
                       </SelectContent>
                     </Select>
                  </div>

                  {copyRange !== 'all' && (
                    <div className="flex gap-2">
                       <Select value={copyYear} onValueChange={setCopyYear}>
                         <SelectTrigger className="w-full text-xs">
                           <SelectValue placeholder="年" />
                         </SelectTrigger>
                         <SelectContent>
                           {availableYearsForCopy.map(y => (
                             <SelectItem key={y} value={y.toString()}>{y}年</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>

                       {copyRange === 'month' && (
                         <Select value={copyMonth} onValueChange={setCopyMonth}>
                           <SelectTrigger className="w-full text-xs">
                             <SelectValue placeholder="月" />
                           </SelectTrigger>
                           <SelectContent>
                             {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                               <SelectItem key={m} value={m.toString()}>{m}月</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       )}
                    </div>
                  )}

                  <Button 
                    variant="outline"
                    onClick={handleCopyData}
                    disabled={!copyTargetHouseholdId}
                    className="w-full"
                  >
                    コピー実行
                  </Button>
                  <p className="text-[10px] text-slate-400 pl-1">
                    ※ 選択した範囲の記録が、選択したグループに追加されます。
                  </p>
                </div>
              </div>

              <div className="border-t pt-2 mt-2">
                {isOwner ? (
                  <Button variant="ghost" className="w-full justify-start h-10 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={deleteHousehold}>
                    <Trash2 className="w-4 h-4 mr-2" /> このグループを削除
                  </Button>
                ) : (
                  <Button variant="ghost" className="w-full justify-start h-10 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={leaveHousehold}>
                    <DoorOpen className="w-4 h-4 mr-2" /> このグループを退出
                  </Button>
                )}
              </div>
            </div>

            <div className="border-t pt-4 mt-4 space-y-6">
               <Button variant="outline" className="w-full justify-start h-12" onClick={handleLogout}>
                 <LogOut className="w-4 h-4 mr-2" /> ログアウト
               </Button>
               
               <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                 <p className="text-xs text-red-500 font-bold mb-2">危険な操作（Danger Zone）</p>
                 <Button variant="destructive" className="w-full justify-start h-10 bg-red-100 text-red-600 hover:bg-red-200 border-red-200 shadow-none" onClick={deleteAccount}>
                   <UserX className="w-4 h-4 mr-2" /> アカウントを削除する
                 </Button>
               </div>
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