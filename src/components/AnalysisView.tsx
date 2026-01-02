"use client";

import React, { useMemo } from 'react';
import { Transaction } from '@/types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  LineChart, Line, CartesianGrid, ReferenceLine, Cell, ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { BarChart3, Store, Gamepad2, ChevronRight, TrendingUp } from 'lucide-react';

type Props = {
  transactions: Transaction[];
  onSelectMachine: (name: string) => void;
  onSelectShop: (name: string) => void;
};

type AggregatedData = {
  name: string;
  amount: number;
  count: number;
  win: number;
  lose: number;
  draw: number;
};

export const AnalysisView = ({ transactions, onSelectMachine, onSelectShop }: Props) => {
  // 月別収支 (直近12ヶ月)
  const monthlyData = useMemo(() => {
    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(new Date(), 11));
    const months = eachMonthOfInterval({ start, end });

    const data = months.map(month => {
      const monthKey = format(month, 'yyyy-MM');
      const monthTransactions = transactions.filter(t => t.date && t.date.startsWith(monthKey));
      const balance = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
      return {
        name: format(month, 'M月', { locale: ja }),
        fullDate: monthKey,
        balance,
      };
    });
    return data;
  }, [transactions]);

  // 資産推移
  const assetData = useMemo(() => {
    // 日付順にソート
    const sorted = [...transactions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    let current = 0;
    const data: { date: string; amount: number }[] = [];
    
    sorted.forEach(t => {
      current += t.amount;
      data.push({
        date: t.date,
        amount: current
      });
    });
    
    // データ点数が多すぎる場合は間引く（簡易的）
    if (data.length > 50) {
      return data.filter((_, i) => i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 50) === 0);
    }
    return data;
  }, [transactions]);

  // 集計関数
  const aggregate = (key: 'machine_name' | 'shop_name'): AggregatedData[] => {
    const map = new Map<string, AggregatedData>();

    transactions.forEach(t => {
      const name = (key === 'machine_name' ? t.machine_name : t.shop_name) || '未設定';
      const current = map.get(name) || { name, amount: 0, count: 0, win: 0, lose: 0, draw: 0 };
      
      current.amount += t.amount;
      current.count += 1;
      if (t.amount > 0) current.win += 1;
      else if (t.amount < 0) current.lose += 1;
      else current.draw += 1;

      map.set(name, current);
    });

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  };

  const machineData = useMemo(() => aggregate('machine_name'), [transactions]);
  const shopData = useMemo(() => aggregate('shop_name'), [transactions]);

  // 金額フォーマッター
  const formatYAxis = (val: number) => {
    if (Math.abs(val) >= 10000) return `${(val / 10000).toFixed(0)}万`;
    return `${(val / 1000).toFixed(0)}k`;
  };

  return (
    <div className="space-y-4 pb-24">
      <Tabs defaultValue="trend" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="trend"><BarChart3 className="w-4 h-4 mr-2" />推移</TabsTrigger>
          <TabsTrigger value="machine"><Gamepad2 className="w-4 h-4 mr-2" />機種別</TabsTrigger>
          <TabsTrigger value="shop"><Store className="w-4 h-4 mr-2" />店舗別</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="space-y-6">
          
          {/* 月別収支グラフ */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500">月別収支 (直近1年)</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{fontSize: 10}} 
                  />
                  <YAxis 
                    width={40} 
                    tick={{fontSize: 10}} 
                    tickFormatter={formatYAxis}
                  />
                  {/* 修正箇所 1: 引数の型を number | undefined にし、?? 0 で安全に処理 */}
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    formatter={(val: number | undefined) => [`${(val ?? 0).toLocaleString()}円`, '収支']}
                  />
                  <ReferenceLine y={0} stroke="#cbd5e1" />
                  <Bar dataKey="balance" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.balance >= 0 ? '#3b82f6' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 資産推移グラフ */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                資産推移
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] w-full pt-2">
               <ResponsiveContainer width="100%" height="100%">
                <LineChart data={assetData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => {
                      try { return format(parseISO(val), 'M/d'); } catch { return val; }
                    }}
                    tick={{fontSize: 10}} 
                    minTickGap={30}
                  />
                  <YAxis 
                    width={40} 
                    tick={{fontSize: 10}} 
                    tickFormatter={formatYAxis} 
                    domain={['auto', 'auto']}
                  />
                  {/* 修正箇所 2: 引数の型を number | undefined にし、?? 0 で安全に処理 */}
                  <Tooltip 
                    labelFormatter={(label) => label}
                    formatter={(val: number | undefined) => [`${(val ?? 0).toLocaleString()}円`, '資産']}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="machine">
          <RankingList data={machineData} type="machine" onSelect={onSelectMachine} />
        </TabsContent>

        <TabsContent value="shop">
          <RankingList data={shopData} type="shop" onSelect={onSelectShop} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ランキングリスト用サブコンポーネント
const RankingList = ({ data, type, onSelect }: { data: AggregatedData[], type: 'machine' | 'shop', onSelect: (name: string) => void }) => {
  if (data.length === 0) return <div className="text-center py-10 text-slate-400">データがありません</div>;

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div 
          key={index}
          onClick={() => onSelect(item.name)}
          className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs shrink-0
              ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-slate-100 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 text-slate-500'}
            `}>
              {index + 1}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate text-sm">{item.name}</p>
              <div className="flex gap-2 text-[10px] text-slate-500 mt-0.5">
                <span>{item.count}戦</span>
                <span>{item.win}勝{item.lose}敗</span>
                {item.count > 0 && <span>勝率{Math.round((item.win / item.count) * 100)}%</span>}
              </div>
            </div>
          </div>
          
          <div className="text-right shrink-0">
            <div className={`text-base font-mono font-bold ${item.amount >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
              {item.amount >= 0 ? '+' : ''}{item.amount.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-end gap-0.5">
              詳細はリストへ <ChevronRight className="w-2.5 h-2.5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};