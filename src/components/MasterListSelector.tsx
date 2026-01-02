"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MasterItem } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, History, Check, Search } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  category: 'shop' | 'machine';
  householdId: string;
  currentValue?: string;
};

export const MasterListSelector = ({ isOpen, onClose, onSelect, category, householdId, currentValue }: Props) => {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [historyItems, setHistoryItems] = useState<string[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'list' | 'history'>('list');

  useEffect(() => {
    if (isOpen && householdId) {
      fetchMasterItems();
      fetchHistory();
      setNewItemName('');
      setSearchQuery('');
    }
  }, [isOpen, householdId, category]);

  // マスターリスト取得
  const fetchMasterItems = async () => {
    const { data } = await supabase
      .from('master_items')
      .select('*')
      .eq('household_id', householdId)
      .eq('category', category)
      .order('name', { ascending: true });
    if (data) setItems(data as MasterItem[]);
  };

  // 履歴取得 (transactionsテーブルから、マスターにないものも含めて直近のものを探す)
  const fetchHistory = async () => {
    const column = category === 'shop' ? 'shop_name' : 'machine_name';
    const { data } = await supabase
      .from('transactions')
      .select(column)
      .eq('household_id', householdId)
      .order('date', { ascending: false })
      .limit(50);

    if (data) {
      // 重複排除してリスト化
      const list = Array.from(new Set(data.map((d: any) => d[column]).filter(Boolean))) as string[];
      setHistoryItems(list);
    }
  };

  // 新規追加
  const handleAdd = async (nameToAdd: string) => {
    if (!nameToAdd) return;
    
    // 既にリストにあるか確認
    const exists = items.find(i => i.name === nameToAdd);
    if (!exists) {
      const { error } = await supabase
        .from('master_items')
        .insert({
          household_id: householdId,
          category,
          name: nameToAdd
        });
      if (!error) {
        await fetchMasterItems(); // リスト更新
      }
    }
    onSelect(nameToAdd);
    onClose();
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{category === 'shop' ? '店舗' : '機種'}を選択</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
           <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="検索または新規入力..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          {/* 検索結果がなく、入力がある場合は「新規追加」ボタンを表示 */}
          {searchQuery && !items.find(i => i.name === searchQuery) && (
            <Button 
              variant="outline" 
              className="w-full mt-2 justify-start text-blue-600 border-blue-200 bg-blue-50"
              onClick={() => handleAdd(searchQuery)}
            >
              <Plus className="w-4 h-4 mr-2" /> 「{searchQuery}」をリストに追加して選択
            </Button>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 grid w-[calc(100%-2rem)] grid-cols-2">
            <TabsTrigger value="list">登録リスト</TabsTrigger>
            <TabsTrigger value="history">履歴から</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="flex-1 overflow-y-auto p-4 pt-2 space-y-1">
            {filteredItems.length === 0 && !searchQuery && (
              <p className="text-center text-sm text-slate-400 py-4">リストは空です</p>
            )}
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => { onSelect(item.name); onClose(); }}
                className="w-full text-left px-3 py-3 rounded-lg hover:bg-slate-100 flex justify-between items-center text-sm font-medium border-b border-slate-50 last:border-0"
              >
                {item.name}
                {currentValue === item.name && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-y-auto p-4 pt-2 space-y-1">
            <p className="text-xs text-slate-400 mb-2">過去の入力履歴 (リスト未登録含む)</p>
            {historyItems.map((name, idx) => {
              const isInMaster = items.some(i => i.name === name);
              return (
                <div key={idx} className="flex gap-2 items-center py-1">
                  <button
                    onClick={() => { onSelect(name); onClose(); }}
                    className="flex-1 text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm border border-slate-100"
                  >
                    {name}
                  </button>
                  {!isInMaster && (
                    <Button 
                      size="sm" variant="ghost" 
                      className="h-8 px-2 text-blue-600"
                      onClick={() => handleAdd(name)}
                      title="リストに登録"
                    >
                      <Plus className="w-4 h-4" /> 登録
                    </Button>
                  )}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};