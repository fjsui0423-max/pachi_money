"use client";

import React, { useMemo, useState } from 'react';
import { Transaction } from '@/types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  LineChart, Line, CartesianGrid, ReferenceLine, Cell, ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, getYear, startOfYear, endOfYear } from 'date-fns';
import { ja } from 'date-fns/locale';
import { BarChart3, Store, Gamepad2, ChevronRight, TrendingUp, AlertCircle } from 'lucide-react'; // AlertCircle追加

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
  const [yearFilter, setYearFilter] = useState<string>('recent');
  const [assetYear, setAssetYear] = useState<string>('all');
  const [assetMonth, setAssetMonth] = useState<string>('all');

  // データが存在する「年」のリスト (データがない場合でも現在の年は含める)
  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => getYear(parseISO(t.date))));
    years.add(getYear(new Date()));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // 月別収支データ生成
  const monthlyData = useMemo(() => {
    let start: Date, end: Date;
    if (yearFilter === 'recent') {
      end = endOfMonth(new Date());
      start = startOfMonth(subMonths(new Date(), 11));
    } else {
      const year = parseInt(yearFilter, 10);
      start = startOfYear(new Date(year, 0, 1));
      end = endOfYear(new Date(year, 0, 1));
    }

    const months = eachMonthOfInterval({ start, end });
    return months.map(month => {
      const monthKey = format(month, 'yyyy-MM');
      const monthTransactions = transactions.filter(t => t.date && t.date.startsWith(monthKey));
      const balance = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
      return {
        name: format(month, 'M月', { locale: ja }),
        fullDate: monthKey,
        balance,
      };
    });
  }, [transactions, yearFilter]);

  // 月別収支の実データがあるか判定 (すべて0ならデータなしとみなす)
  const hasMonthlyData = useMemo(() => {
    return monthlyData.some(d => d.balance !== 0);
  }, [monthlyData]);

  // 資産推移データ生成
  const assetData = useMemo(() => {
    let targetTransactions = [...transactions];
    
    if (assetYear !== 'all') {
      targetTransactions = targetTransactions.filter(t => getYear(parseISO(t.date)).toString() === assetYear);
      if (assetMonth !== 'all') {
        targetTransactions = targetTransactions.filter(t => format(parseISO(t.date), 'MM') === assetMonth);
      }
    }

    targetTransactions.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    let current = 0;
    const data: { date: string; amount: number; label: string }[] = [];
    
    targetTransactions.forEach(t => {
      current += t.amount;
      let label = t.date;
      try {
        const d = parseISO(t.date);
        if (assetYear !== 'all' && assetMonth !== 'all') label = format(d, 'd日');
        else if (assetYear !== 'all') label = format(d, 'M/d');
        else label = format(d, 'yy/M/d');
      } catch (e) {}

      data.push({ date: t.date, amount: current, label });
    });

    if (data.length > 60) {
      return data.filter((_, i) => i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 60) === 0);
    }
    return data;
  }, [transactions, assetYear, assetMonth]);

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
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold text-slate-500">
                月別収支 {yearFilter !== 'recent' && `(${yearFilter}年)`}
              </CardTitle>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[110px] h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">直近1年</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={String(year)}>{year}年</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="h-[250px] w-full pt-2 relative">
              {/* ▼ データがない場合のオーバーレイ表示 */}
              {!hasMonthlyData && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 z-10">
                  <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 font-bold">データがありません</p>
                  <p className="text-xs text-slate-400">この期間の収支記録はありません</p>
                </div>
              )}
              
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fontSize: 10}} />
                  <YAxis width={40} tick={{fontSize: 10}} tickFormatter={formatYAxis} />
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
            <CardHeader className="pb-2 flex flex-col space-y-2">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-sm font-bold text-slate-500 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  資産推移
                </CardTitle>
              </div>
              
              <div className="flex items-center justify-end gap-2 w-full">
                <Select 
                  value={assetYear} 
                  onValueChange={(val) => {
                    setAssetYear(val);
                    setAssetMonth('all');
                  }}
                >
                  <SelectTrigger className="w-[100px] h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="年" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全期間</SelectItem>
                    {availableYears.map(year => (
                      <SelectItem key={`year-${year}`} value={String(year)}>{year}年</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {assetYear !== 'all' && (
                  <Select value={assetMonth} onValueChange={setAssetMonth}>
                    <SelectTrigger className="w-[80px] h-8 text-xs bg-slate-50 border-slate-200">
                      <SelectValue placeholder="月" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      <SelectItem value="all">1年通して</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <SelectItem key={m} value={String(m).padStart(2, '0')}>{m}月</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

            </CardHeader>
            <CardContent className="h-[250px] w-full pt-2 relative">
               {/* ▼ データがない場合のオーバーレイ表示 */}
               {assetData.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 z-10">
                  <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 font-bold">データがありません</p>
                  <p className="text-xs text-slate-400">選択された期間の記録はありません</p>
                </div>
              )}

               <ResponsiveContainer width="100%" height="100%">
                <LineChart data={assetData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    tick={{fontSize: 10}} 
                    minTickGap={30}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    width={40} 
                    tick={{fontSize: 10}} 
                    tickFormatter={formatYAxis} 
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0] && payload[0].payload) {
                        return format(parseISO(payload[0].payload.date), 'yyyy年M月d日');
                      }
                      return label;
                    }}
                    formatter={(val: number | undefined) => [`${(val ?? 0).toLocaleString()}円`, '収支']}
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