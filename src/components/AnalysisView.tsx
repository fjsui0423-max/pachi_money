"use client";

import React, { useMemo, useState } from 'react';
import { Transaction } from '@/types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  LineChart, Line, CartesianGrid, ReferenceLine, Cell, ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, getYear, startOfYear, endOfYear, isSameMonth, isSameYear } from 'date-fns';
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
  // 月別収支用の年フィルタ
  const [yearFilter, setYearFilter] = useState<string>('recent');
  
  // ▼ 追加: 資産推移用の期間フィルタ ('all' | 'year_2024' | 'month_2024-01')
  const [assetRange, setAssetRange] = useState<string>('all');

  // データが存在する「年」のリスト
  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => getYear(parseISO(t.date))));
    years.add(getYear(new Date()));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // ▼ 追加: データが存在する「年月」のリスト
  const availableMonths = useMemo(() => {
    const months = new Set(transactions.map(t => format(parseISO(t.date), 'yyyy-MM')));
    months.add(format(new Date(), 'yyyy-MM'));
    return Array.from(months).sort().reverse(); // 新しい順
  }, [transactions]);

  // 月別収支データ生成 (ロジック変更なし)
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

  // ▼ 修正: 資産推移データの生成 (フィルタ対応)
  const assetData = useMemo(() => {
    // 1. 期間でフィルタリング
    let targetTransactions = [...transactions];
    
    if (assetRange !== 'all') {
      const [type, val] = assetRange.split('_'); // 'year_2024' -> ['year', '2024']
      
      targetTransactions = targetTransactions.filter(t => {
        const d = parseISO(t.date);
        if (type === 'year') {
          return getYear(d).toString() === val;
        } else if (type === 'month') {
          return format(d, 'yyyy-MM') === val;
        }
        return true;
      });
    }

    // 日付順にソート
    targetTransactions.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // 2. 累積収支を計算 (期間の開始を0とする)
    let current = 0;
    const data: { date: string; amount: number; label: string }[] = [];
    
    // グラフの開始点として (0,0) を追加するかどうかの検討
    // 線がつながるように、最初の取引の前日などを入れた方が綺麗だが、今回はシンプルにデータ点のみ
    
    targetTransactions.forEach(t => {
      current += t.amount;
      // X軸ラベルのフォーマット調整
      let label = t.date;
      try {
        const d = parseISO(t.date);
        if (assetRange.startsWith('month')) {
          label = format(d, 'd日'); // 月別表示なら「1日」
        } else if (assetRange.startsWith('year')) {
          label = format(d, 'M/d'); // 年別表示なら「1/1」
        } else {
          label = format(d, 'yy/M/d'); // 全期間なら「23/1/1」
        }
      } catch (e) {}

      data.push({
        date: t.date,
        amount: current,
        label: label
      });
    });

    // データ点数が多すぎる場合の間引き処理
    if (data.length > 60) {
      return data.filter((_, i) => i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 60) === 0);
    }

    // データが1件もない場合は空配列
    if (data.length === 0) return [];

    // データが1点だけだと線が引かれないため、ダミーの開始点(0)を追加しても良いが、
    // Rechartsは1点だと点を描画してくれるのでそのままでOK
    return data;
  }, [transactions, assetRange]);

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
            <CardContent className="h-[250px] w-full pt-2">
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
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold text-slate-500 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                資産推移
              </CardTitle>
              {/* ▼ 追加: 期間選択ドロップダウン */}
              <Select value={assetRange} onValueChange={setAssetRange}>
                <SelectTrigger className="w-[120px] h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">全期間</SelectItem>
                  
                  {/* 年別グループ */}
                  <SelectGroup>
                    <SelectLabel className="text-xs text-slate-400 font-normal px-2 py-1">年別</SelectLabel>
                    {availableYears.map(year => (
                      <SelectItem key={`year-${year}`} value={`year_${year}`}>{year}年</SelectItem>
                    ))}
                  </SelectGroup>

                  {/* 月別グループ */}
                  <SelectGroup>
                    <SelectLabel className="text-xs text-slate-400 font-normal px-2 py-1">月別</SelectLabel>
                    {availableMonths.slice(0, 12).map(month => ( // 直近12ヶ月分のみ表示
                      <SelectItem key={`month-${month}`} value={`month_${month}`}>
                        {format(parseISO(month + '-01'), 'yyyy年M月', { locale: ja })}
                      </SelectItem>
                    ))}
                    {/* もっと過去の月が必要なら slice を外してください */}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="h-[250px] w-full pt-2">
               <ResponsiveContainer width="100%" height="100%">
                <LineChart data={assetData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" // 生成した短いラベルを使用
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
                      // ツールチップには正確な日付(payload内のdate)を表示
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
              {assetData.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                  データがありません
                </div>
              )}
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