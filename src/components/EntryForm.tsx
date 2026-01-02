"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction } from '@/types';
import { Loader2, Save, Trash2, PlusCircle } from 'lucide-react'; // PlusCircle追加
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  householdId?: string;
  initialData?: Transaction | null;
};

export const EntryForm = ({ isOpen, onClose, onSuccess, householdId, initialData }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [date, setDate] = useState('');
  const [shopName, setShopName] = useState('');
  const [machineName, setMachineName] = useState('');
  const [investment, setInvestment] = useState('');
  const [recovery, setRecovery] = useState('');
  const [memo, setMemo] = useState('');

  const [history, setHistory] = useState<{ shops: string[], machines: string[] }>({ shops: [], machines: [] });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDate(initialData.date);
        setShopName(initialData.shop_name);
        setMachineName(initialData.machine_name);
        setInvestment(initialData.investment.toString());
        setRecovery(initialData.recovery.toString());
        setMemo(initialData.memo || '');
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setShopName('');
        setMachineName('');
        setInvestment('');
        setRecovery('');
        setMemo('');
      }
      fetchHistory();
    }
  }, [isOpen, initialData, householdId]);

  const fetchHistory = async () => {
    if (!householdId) return;
    const { data } = await supabase.from('transactions')
      .select('shop_name, machine_name')
      .eq('household_id', householdId)
      .limit(50);
    
    if (data) {
      setHistory({
        shops: Array.from(new Set(data.map(d => d.shop_name).filter(Boolean))) as string[],
        machines: Array.from(new Set(data.map(d => d.machine_name).filter(Boolean))) as string[],
      });
    }
  };

  // ★追加機能: 金額を加算するヘルパー関数
  const addAmount = (currentValue: string, setter: (val: string) => void, amount: number) => {
    const current = parseInt(currentValue || '0', 10);
    setter((current + amount).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId) return;
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No User");

      const inv = parseInt(investment || '0');
      const rec = parseInt(recovery || '0');
      const balance = rec - inv;

      const payload = {
        household_id: householdId,
        user_id: user.id,
        date,
        shop_name: shopName,
        machine_name: machineName,
        investment: inv,
        recovery: rec,
        amount: balance,
        type: balance >= 0 ? 'income' : 'expense',
        memo
      };

      if (initialData) {
        await supabase.from('transactions').update(payload).eq('id', initialData.id);
      } else {
        await supabase.from('transactions').insert(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert('保存エラーが発生しました');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData || !confirm('本当に削除しますか？')) return;
    setIsDeleting(true);
    try {
      await supabase.from('transactions').delete().eq('id', initialData.id);
      onSuccess();
      onClose();
    } catch (err) {
      alert('削除できませんでした');
    } finally {
      setIsDeleting(false);
    }
  };

  const currentBalance = (parseInt(recovery || '0') - parseInt(investment || '0'));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? '記録の編集' : '新規記録'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          
          <div className="grid gap-2">
            <Label>日付</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>店舗</Label>
              <Input list="shop-list" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="店名" />
              <datalist id="shop-list">{history.shops.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="grid gap-2">
              <Label>機種</Label>
              <Input list="machine-list" value={machineName} onChange={e => setMachineName(e.target.value)} placeholder="機種名" />
              <datalist id="machine-list">{history.machines.map(m => <option key={m} value={m} />)}</datalist>
            </div>
          </div>

          {/* 収支計算エリア (金額入力サポート付き) */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
            
            {/* 投資 */}
            <div className="grid gap-2">
              <Label className="text-red-500 font-bold">投資 (IN)</Label>
              <Input 
                type="number" 
                value={investment} 
                onChange={e => setInvestment(e.target.value)} 
                className="text-right font-mono text-lg" 
                placeholder="0" 
              />
              {/* 補助ボタン */}
              <div className="flex gap-1 justify-end">
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => addAmount(investment, setInvestment, 1000)}>
                  +1k
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => addAmount(investment, setInvestment, 5000)}>
                  +5k
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => addAmount(investment, setInvestment, 10000)}>
                  +10k
                </Button>
              </div>
            </div>

            {/* 回収 */}
            <div className="grid gap-2">
              <Label className="text-blue-500 font-bold">回収 (OUT)</Label>
              <Input 
                type="number" 
                value={recovery} 
                onChange={e => setRecovery(e.target.value)} 
                className="text-right font-mono text-lg" 
                placeholder="0" 
              />
              {/* 補助ボタン */}
              <div className="flex gap-1 justify-end">
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => addAmount(recovery, setRecovery, 1000)}>
                  +1k
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => addAmount(recovery, setRecovery, 5000)}>
                  +5k
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => addAmount(recovery, setRecovery, 10000)}>
                  +10k
                </Button>
              </div>
            </div>

            <div className="col-span-2 flex justify-between border-t pt-2 mt-2">
              <span className="font-bold text-sm">収支</span>
              <span className={`font-mono font-bold text-lg ${currentBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {currentBalance >= 0 ? '+' : ''}{currentBalance.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>メモ</Label>
            <Textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="狙い台、挙動など" />
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between mt-4">
            {initialData && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting} className="w-full sm:w-auto">
                <Trash2 className="w-4 h-4 mr-2" /> 削除
              </Button>
            )}
            <Button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {initialData ? '更新する' : '記録する'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
};