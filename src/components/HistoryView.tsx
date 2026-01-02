"use client";

import React, { useMemo } from 'react';
import { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { Trophy, CalendarRange, Calendar } from 'lucide-react';

type Props = {
  transactions: Transaction[];
};

export const HistoryView = ({ transactions }: Props) => {
  
  // 1. 生涯収支
  const lifetimeBalance = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // 2. 年別集計
  const yearlyData = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      if(!t.date) return;
      const year = t.date.substring(0, 4); // "2024"
      map.set(year, (map.get(year) || 0) + t.amount);
    });
    return Array.from(map.entries())
      .map(([year, amount]) => ({ year, amount }))
      .sort((a, b) => b.year.localeCompare(a.year)); // 新しい年順
  }, [transactions]);

  // 3. 月別集計
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      if(!t.date) return;
      const monthKey = t.date.substring(0, 7); // "2024-01"
      map.set(monthKey, (map.get(monthKey) || 0) + t.amount);
    });
    return Array.from(map.entries())
      .map(([key, amount]) => ({ 
        key, 
        label: format(parseISO(key + '-01'), 'yyyy年 M月'),
        amount 
      }))
      .sort((a, b) => b.key.localeCompare(a.key)); // 新しい月順
  }, [transactions]);

  return (
    <div className="space-y-4 pb-20">
      
      {/* 生涯収支カード */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-700 text-white border-none shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" /> 生涯トータル収支
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-4xl font-mono font-bold ${lifetimeBalance >= 0 ? 'text-blue-300' : 'text-red-300'}`}>
            {lifetimeBalance >= 0 ? '+' : ''}{lifetimeBalance.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* 年別リスト */}
      <Card>
        <CardHeader className="py-3 bg-slate-50 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <CalendarRange className="w-4 h-4" /> 年別収支
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {yearlyData.map((item, idx) => (
            <div key={item.year} className={`flex justify-between items-center p-3 text-sm ${idx !== yearlyData.length - 1 ? 'border-b' : ''}`}>
              <span className="font-bold text-slate-700">{item.year}年</span>
              <span className={`font-mono font-bold ${item.amount >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}
              </span>
            </div>
          ))}
          {yearlyData.length === 0 && <div className="p-4 text-center text-xs text-slate-400">データがありません</div>}
        </CardContent>
      </Card>

      {/* 月別リスト */}
      <Card>
        <CardHeader className="py-3 bg-slate-50 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Calendar className="w-4 h-4" /> 月別収支 (全期間)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {monthlyData.map((item, idx) => (
            <div key={item.key} className={`flex justify-between items-center p-3 text-sm ${idx !== monthlyData.length - 1 ? 'border-b' : ''}`}>
              <span className="font-medium text-slate-600">{item.label}</span>
              <span className={`font-mono font-bold ${item.amount >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}
              </span>
            </div>
          ))}
          {monthlyData.length === 0 && <div className="p-4 text-center text-xs text-slate-400">データがありません</div>}
        </CardContent>
      </Card>

    </div>
  );
};