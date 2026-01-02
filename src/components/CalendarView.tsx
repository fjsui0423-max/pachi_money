import React, { useState, useMemo, useEffect } from 'react';
import { Transaction } from '@/types';
import { TransactionItem } from '@/components/TransactionItem'; // リスト表示用コンポーネントをインポート
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

type Props = {
  transactions: Transaction[];
  onSelectTransaction: (t: Transaction) => void;
  currentDate: Date;
};

export const CalendarView = ({ transactions, onSelectTransaction, currentDate }: Props) => {
  // 選択された日付を管理するステート
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // 表示月が変わったら選択状態をリセット（または初期化）
  useEffect(() => {
    setSelectedDate(null);
  }, [currentDate]);

  // カレンダーのグリッド生成
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: ja });
  const endDate = endOfWeek(monthEnd, { locale: ja });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  // 日付ごとのデータ取得ヘルパー
  const getDayData = (date: Date) => {
    const dayTrans = transactions.filter(t => t.date && isSameDay(parseISO(t.date), date));
    const total = dayTrans.reduce((sum, t) => sum + t.amount, 0);
    return { transactions: dayTrans, total };
  };

  // 選択された日のデータリスト
  const selectedDayTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return transactions.filter(t => t.date && isSameDay(parseISO(t.date), selectedDate));
  }, [selectedDate, transactions]);

  return (
    <div className="w-full bg-white text-sm pb-4">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {weekDays.map((day, i) => (
          <div key={day} className={`py-2 text-center text-xs font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 auto-rows-[minmax(60px,1fr)] border-b border-slate-100">
        {calendarDays.map((day, dayIdx) => {
          const { transactions: dayTrans, total } = getDayData(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isPositive = total > 0;
          const isNegative = total < 0;
          
          // 選択中の日付かどうか
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <div
              key={day.toString()}
              className={`
                relative border-b border-r border-slate-100 p-1 flex flex-col items-center justify-start transition-all
                ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-300' : 'bg-white text-slate-700'}
                ${dayTrans.length > 0 ? 'cursor-pointer hover:bg-slate-50' : ''}
                ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400 z-10' : ''}
              `}
              onClick={() => {
                // データがある日、または同月内の日なら選択可能にする
                if (dayTrans.length > 0 || isCurrentMonth) {
                  setSelectedDate(day);
                }
              }}
            >
              <span className={`
                text-xs mb-1 font-medium w-5 h-5 flex items-center justify-center rounded-full
                ${isSameDay(day, new Date()) ? 'bg-blue-600 text-white shadow-sm' : ''}
              `}>
                {format(day, 'd')}
              </span>

              {dayTrans.length > 0 && (
                <div className="flex flex-col items-center w-full">
                  <span className={`text-[10px] font-bold ${isPositive ? 'text-blue-600' : isNegative ? 'text-red-500' : 'text-slate-400'}`}>
                    {total > 0 ? '+' : ''}{total.toLocaleString()}
                  </span>
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {dayTrans.map((t, i) => (
                      <div 
                        key={i} 
                        className={`w-1.5 h-1.5 rounded-full ${t.amount >= 0 ? 'bg-blue-400' : 'bg-red-400'}`} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 選択された日の詳細リスト表示エリア */}
      {selectedDate && (
        <div className="pt-4 px-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-500">
            <span>{format(selectedDate, 'M月d日', { locale: ja })}の収支</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>
          
          {selectedDayTransactions.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              記録がありません
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayTransactions.map((t) => (
                <TransactionItem 
                  key={t.id} 
                  transaction={t} 
                  onClick={onSelectTransaction} 
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};