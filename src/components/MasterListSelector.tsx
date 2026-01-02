"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MasterItem } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Check, Pencil, Trash2, X, Save, Loader2 } from 'lucide-react'; // アイコン追加

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
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'list' | 'history'>('list');
  
  // ★編集用ステート
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && householdId) {
      fetchMasterItems();
      fetchHistory();
      setSearchQuery('');
      setEditingId(null);
    }
  }, [isOpen, householdId, category]);

  const fetchMasterItems = async () => {
    const { data } = await supabase
      .from('master_items')
      .select('*')
      .eq('household_id', householdId)
      .eq('category', category)
      .order('name', { ascending: true });
    if (data) setItems(data as MasterItem[]);
  };

  const fetchHistory = async () => {
    const column = category === 'shop' ? 'shop_name' : 'machine_name';
    const { data } = await supabase
      .from('transactions')
      .select(column)
      .eq('household_id', householdId)
      .order('date', { ascending: false })
      .limit(50);

    if (data) {
      const list = Array.from(new Set(data.map((d: any) => d[column]).filter(Boolean))) as string[];
      setHistoryItems(list);
    }
  };

  // 新規追加
  const handleAdd = async (nameToAdd: string) => {
    if (!nameToAdd || isSubmitting) return;
    setIsSubmitting(true);
    
    const exists = items.find(i => i.name === nameToAdd);
    if (!exists) {
      const { error } = await supabase.from('master_items').insert({
        household_id: householdId,
        category,
        name: nameToAdd
      });
      if (!error) await fetchMasterItems();
    }
    setIsSubmitting(false);
    onSelect(nameToAdd);
    onClose();
  };

  // ★削除機能
  const handleDelete = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation(); // 行クリックイベントを止める
    if (!confirm(`リストから「${name}」を削除しますか？\n(過去の記録は消えません)`)) return;
    
    setIsSubmitting(true);
    const { error } = await supabase.from('master_items').delete().eq('id', id);
    if (error) {
      alert('削除に失敗しました');
    } else {
      await fetchMasterItems();
    }
    setIsSubmitting(false);
  };

  // ★編集モード開始
  const startEdit = (e: React.MouseEvent, item: MasterItem) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditName(item.name);
  };

  // ★編集保存
  const saveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editName || !editingId) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from('master_items')
      .update({ name: editName })
      .eq('id', editingId);

    if (error) {
      alert('更新できませんでした');
    } else {
      await fetchMasterItems();
      setEditingId(null);
    }
    setIsSubmitting(false);
  };

  // ★編集キャンセル
  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
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
          {searchQuery && !items.find(i => i.name === searchQuery) && (
            <Button 
              variant="outline" 
              className="w-full mt-2 justify-start text-blue-600 border-blue-200 bg-blue-50"
              onClick={() => handleAdd(searchQuery)}
              disabled={isSubmitting}
            >
              <Plus className="w-4 h-4 mr-2" /> 「{searchQuery}」をリストに追加
            </Button>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 grid w-[calc(100%-2rem)] grid-cols-2">
            <TabsTrigger value="list">登録リスト</TabsTrigger>
            <TabsTrigger value="history">履歴から</TabsTrigger>
          </TabsList>

          {/* ★登録リストタブ */}
          <TabsContent value="list" className="flex-1 overflow-y-auto p-4 pt-2 space-y-1">
            {filteredItems.length === 0 && !searchQuery && (
              <p className="text-center text-sm text-slate-400 py-4">リストは空です</p>
            )}
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="w-full flex justify-between items-center text-sm font-medium border-b border-slate-50 last:border-0 rounded-lg hover:bg-slate-50 group"
              >
                {editingId === item.id ? (
                  // 編集モード
                  <div className="flex items-center gap-1 w-full p-1">
                    <Input 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={saveEdit}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={cancelEdit}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  // 通常モード
                  <>
                    <button
                      onClick={() => { onSelect(item.name); onClose(); }}
                      className="flex-1 text-left px-3 py-3 flex items-center justify-between"
                    >
                      <span className="truncate">{item.name}</span>
                      {currentValue === item.name && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                    
                    {/* 操作ボタン (ホバー時またはスマホでは常に表示領域確保) */}
                    <div className="flex items-center px-2 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" variant="ghost" 
                        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        onClick={(e) => startEdit(e, item)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        size="icon" variant="ghost" 
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => handleDelete(e, item.id, item.name)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </TabsContent>

          {/* 履歴タブ */}
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
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 登録
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