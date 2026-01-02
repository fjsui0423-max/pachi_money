import React, { useMemo, useState } from 'react';
import { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type Props = {
  transactions: Transaction[];
  onSelectMonth: (date: Date) => void; // 月が選択されたときのコールバック
};

export const HistoryView = ({ transactions, onSelectMonth }: Props) => {
  // 表示モード: 'year' = 年一覧, 'month' = 特定の年の月一覧
  const [viewLevel, setViewLevel] = useState<'year' | 'month'>('year');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // 全期間の集計（生涯収支）
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

  // 年別データ集計
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

  // 選択された年の月別データ集計
  const monthlyDataInYear = useMemo(() => {
    if (!selectedYear) return [];
    
    const map = new Map<string, number>(); // "01", "02"... -> amount
    
    transactions.forEach(t => {
      if (!t.date) return;
      if (!t.date.startsWith(selectedYear)) return;
      
      const month = t.date.substring(5, 7); // "YYYY-MM-DD" -> "MM"
      map.set(month, (map.get(month) || 0) + t.amount);
    });

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // 新しい月順（12月→1月）
      .map(([month, amount]) => ({ 
        month, 
        amount,
        // 日付オブジェクトを作成（遷移用）: その月の1日
        dateObj: new Date(parseInt(selectedYear), parseInt(month) - 1, 1)
      }));
  }, [transactions, selectedYear]);

  // 年を選択したときの処理
  const handleYearClick = (year: string) => {
    setSelectedYear(year);
    setViewLevel('month');
  };

  // 年一覧に戻る
  const handleBackToYear = () => {
    setViewLevel('year');
    setSelectedYear('');
  };

  return (
    <div className="space-y-4 pb-20">
      
      {/* ナビゲーションヘッダー（月選択時のみ表示） */}
      {viewLevel === 'month' && (
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={handleBackToYear} className="gap-1 pl-0 text-slate-500 hover:text-slate-800">
            <ChevronLeft className="w-5 h-5" />
            <span className="font-bold">{selectedYear}年</span>
          </Button>
          <span className="text-sm text-slate-400">の月別アーカイブ</span>
        </div>
      )}

      {/* 生涯収支カード (年一覧のときのみ表示して、画面をすっきりさせる) */}
      {viewLevel === 'year' && (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none shadow-lg mb-6">
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
      )}

      {/* リスト表示エリア */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-500 px-1">
          {viewLevel === 'year' ? '年別アーカイブ' : `${selectedYear}年の月別`}
        </h3>

        {/* 年リスト */}
        {viewLevel === 'year' && (
          <>
            {yearlyData.length === 0 && <p className="text-sm text-slate-400 p-2">データがありません</p>}
            {yearlyData.map((item) => (
              <div 
                key={item.year} 
                onClick={() => handleYearClick(item.year)}
                className="bg-white p-4 rounded-lg border border-slate-100 flex justify-between items-center shadow-sm cursor-pointer hover:bg-slate-50 transition-colors active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-slate-700">{item.year}年</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold ${item.amount >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {item.amount >= 0 ? '+' : ''}{item.amount.toLocaleString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            ))}
          </>
        )}

        {/* 月リスト */}
        {viewLevel === 'month' && (
          <>
            {monthlyDataInYear.length === 0 && <p className="text-sm text-slate-400 p-2">この年のデータはありません</p>}
            {monthlyDataInYear.map((item) => (
              <div 
                key={item.month} 
                onClick={() => onSelectMonth(item.dateObj)}
                className="bg-white p-4 rounded-lg border border-slate-100 flex justify-between items-center shadow-sm cursor-pointer hover:bg-slate-50 transition-colors active:scale-[0.99]"
              >
                 <div className="flex items-center gap-2">
                  <span className="w-8 font-bold text-slate-700">{parseInt(item.month)}月</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold ${item.amount >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {item.amount >= 0 ? '+' : ''}{item.amount.toLocaleString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};