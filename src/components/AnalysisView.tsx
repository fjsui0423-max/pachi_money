"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Transaction } from '@/types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  LineChart, Line, CartesianGrid, ReferenceLine, Cell 
} from 'recharts'; // ResponsiveContainer を削除
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { Trophy, TrendingUp, BarChart3, Loader2 } from 'lucide-react';

type Props = {
  transactions: Transaction[];
};

export const AnalysisView = ({ transactions }: Props) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. 月別データ集計
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      if (!t.date) return;
      const monthKey = t.date.substring(0, 7);
      const current = map.get(monthKey) || 0;
      map.set(monthKey, current + t.amount);
    });

    return Array.from(map.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        label: format(parseISO(d.date + '-01'), 'M月'),
        fill: d.amount >= 0 ? '#3b82f6' : '#ef4444',
      }));
  }, [transactions]);

  // 2. 累積データ集計
  const cumulativeData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let total = 0;
    return sorted.map(t => {
      total += t.amount;
      return {
        date: t.date,
        shortDate: format(parseISO(t.date), 'M/d'),
        total,
      };
    });
  }, [transactions]);

  // 3. 機種別ランキング
  const machineRanking = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      if (!t.machine_name) return;
      const current = map.get(t.machine_name) || 0;
      map.set(t.machine_name, current + t.amount);
    });
    
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  const fmtK = (val: number) => (val / 1000).toFixed(0) + 'k';

  if (!isMounted) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300 mx-4">
        <p className="text-slate-500 font-bold">データがありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* 月別収支 */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
            <BarChart3 className="w-4 h-4 text-blue-500" /> 月別収支
          </CardTitle>
        </CardHeader>
        {/* スクロール可能にして、グラフ幅を固定(350px)にする */}
        <CardContent className="p-2 overflow-x-auto">
          <div className="min-w-[320px] flex justify-center">
            <BarChart width={320} height={250} data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtK} width={35} />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                formatter={(val: any) => [`¥${val.toLocaleString()}`, '収支']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {monthlyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </CardContent>
      </Card>

      {/* 資産推移 */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
            <TrendingUp className="w-4 h-4 text-green-500" /> 資産推移
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 overflow-x-auto">
          <div className="min-w-[320px] flex justify-center">
            <LineChart width={320} height={250} data={cumulativeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="shortDate" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtK} width={35} />
              <Tooltip 
                formatter={(val: any) => [`¥${val.toLocaleString()}`, 'トータル']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={false} 
                activeDot={{ r: 6, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </div>
        </CardContent>
      </Card>

      {/* 機種別ランキング */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
            <Trophy className="w-4 h-4 text-amber-500" /> 勝ち機種ベスト5
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {machineRanking.length === 0 && <p className="text-xs text-slate-400">データ不足です</p>}
          {machineRanking.map((item, idx) => (
            <div key={item.name} className="flex items-center justify-between text-sm border-b border-slate-100 last:border-0 pb-2 last:pb-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className={`
                  w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold shrink-0 shadow-sm
                  ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400'}
                `}>
                  {idx + 1}
                </span>
                <span className="truncate font-medium text-slate-700">{item.name}</span>
              </div>
              <span className={`font-mono font-bold ${item.amount >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
};