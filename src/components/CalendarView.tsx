import React, { useState } from 'react';
import { Transaction } from '@/types';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths 
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  transactions: Transaction[];
};

export const CalendarView = ({ transactions }: Props) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getDailyBalance = (date: Date) => {
    const dailyTrans = transactions.filter(t => isSameDay(new Date(t.date), date));
    if (dailyTrans.length === 0) return null;
    return dailyTrans.reduce((sum, t) => sum + t.amount, 0);
  };

  // ★変更点: 金額を 'k' 単位 (千円単位) に変換する関数
  const formatK = (amount: number) => {
    // 1000で割って、小数点第1位まで表示 (例: 1500 -> 1.5, 2000 -> 2)
    const kVal = amount / 1000;
    // 小数点が .0 の場合は整数にする (2.0k -> 2k)
    const formatted = kVal % 1 === 0 ? kVal.toFixed(0) : kVal.toFixed(1);
    return formatted + 'k';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="font-bold text-lg">
          {format(currentDate, 'yyyy年 M月', { locale: ja })}
        </span>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center mb-2">
        {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
          <div key={day} className={`text-xs font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'}`}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const balance = getDailyBalance(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isPositive = balance !== null && balance >= 0;

          return (
            <div 
              key={idx} 
              className={`
                min-h-[60px] p-1 border rounded-md flex flex-col justify-between
                ${!isCurrentMonth ? 'bg-slate-50 text-slate-300' : 'bg-white text-slate-700'}
              `}
            >
              <span className={`text-xs font-bold ${!isCurrentMonth ? '' : 'text-slate-600'}`}>
                {format(day, 'd')}
              </span>
              
              {balance !== null && (
                // ★変更点: 文字サイズを調整し、formatK関数を使用
                <span className={`text-[11px] font-mono font-bold truncate ${isPositive ? 'text-blue-600' : 'text-red-500'}`}>
                  {balance > 0 ? '+' : ''}{formatK(balance)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};