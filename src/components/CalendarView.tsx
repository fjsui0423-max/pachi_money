import React from 'react';
import { Transaction } from '@/types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

type Props = {
  transactions: Transaction[];
  onSelectTransaction: (t: Transaction) => void;
  currentDate: Date; // ★追加: 親から表示する月を受け取る
};

export const CalendarView = ({ transactions, onSelectTransaction, currentDate }: Props) => {
  // カレンダーのグリッド生成（表示月の開始日〜終了日を含む週全体）
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: ja }); // 月曜始まり等の調整が必要ならここで行う
  const endDate = endOfWeek(monthEnd, { locale: ja });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  // 日付ごとの収支計算
  const getDayData = (date: Date) => {
    const dayTrans = transactions.filter(t => t.date && isSameDay(parseISO(t.date), date));
    const total = dayTrans.reduce((sum, t) => sum + t.amount, 0);
    return { transactions: dayTrans, total };
  };

  return (
    <div className="w-full bg-white text-sm">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {weekDays.map((day, i) => (
          <div key={day} className={`py-2 text-center text-xs font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 auto-rows-[minmax(60px,1fr)]">
        {calendarDays.map((day, dayIdx) => {
          const { transactions: dayTrans, total } = getDayData(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isPositive = total > 0;
          const isNegative = total < 0;

          return (
            <div
              key={day.toString()}
              className={`
                relative border-b border-r border-slate-100 p-1 flex flex-col items-center justify-start transition-colors
                ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-300' : 'bg-white text-slate-700'}
                ${dayTrans.length > 0 ? 'cursor-pointer hover:bg-blue-50' : ''}
              `}
              // 日付セル全体をクリックしたら、その日の最初のデータを編集（簡易的な挙動）
              // ※本来は「その日のリスト」を開くのがベストですが、ここでは編集フォームを開く仕様に合わせています
              onClick={() => {
                if (dayTrans.length > 0) {
                  onSelectTransaction(dayTrans[0]);
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
                  {/* 件数バッジ (SPで見やすいように) */}
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
    </div>
  );
};