import React, { useMemo } from 'react';
import { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, TrendingUp, TrendingDown, List, CalendarDays } from 'lucide-react';

type Props = {
  transactions: Transaction[];
  onSwitchToDaily: () => void;
};

export const HistoryView = ({ transactions, onSwitchToDaily }: Props) => {
  // 全期間の集計
  const summary = useMemo(() => {
    let total = 0;
    let winCount = 0;
    let loseCount = 0;
    
    transactions.forEach(t => {
      total += t.amount;
      if (t.amount > 0) winCount++;
      if (t.amount < 0) loseCount++;
    });

    return { total, winCount, loseCount };
  }, [transactions]);

  // 年別集計
  const yearlyData = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      if (!t.date) return;
      const year = t.date.substring(0, 4);
      map.set(year, (map.get(year) || 0) + t.amount);
    });

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // 新しい年順
      .map(([year, amount]) => ({ year, amount }));
  }, [transactions]);

  return (
    <div className="space-y-4 pb-20">
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary">
            <CalendarDays className="w-4 h-4 mr-2" />
            サマリー・年別
          </TabsTrigger>
          <TabsTrigger value="daily" onClick={onSwitchToDaily}>
            <List className="w-4 h-4 mr-2" />
            日別リスト
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4 mt-4">
          {/* 生涯収支カード */}
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> 生涯収支
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-mono font-bold tracking-tight ${summary.total >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {summary.total >= 0 ? '+' : ''}{summary.total.toLocaleString()}
              </div>
              <div className="flex gap-4 mt-4 text-sm text-slate-400">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-red-400" />
                  <span>勝: {summary.winCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown className="w-4 h-4 text-blue-400" />
                  <span>負: {summary.loseCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 年別リスト */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-500 px-1">年別アーカイブ</h3>
            {yearlyData.length === 0 && <p className="text-sm text-slate-400 p-2">データがありません</p>}
            {yearlyData.map((item) => (
              <div key={item.year} className="bg-white p-4 rounded-lg border border-slate-100 flex justify-between items-center shadow-sm">
                <span className="font-bold text-slate-700">{item.year}年</span>
                <span className={`font-mono font-bold ${item.amount >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                  {item.amount >= 0 ? '+' : ''}{item.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* dailyタブの中身は空にする（onClickでページ遷移するため） */}
        <TabsContent value="daily">
          <div className="py-10 text-center text-slate-400">
            読み込み中...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};