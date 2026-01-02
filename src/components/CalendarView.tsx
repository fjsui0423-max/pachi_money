import React, { useState } from 'react';
import { Transaction } from '@/types';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  getDay, isSameMonth, isSameDay, parseISO 
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { TransactionItem } from '@/components/TransactionItem'; // リスト表示用

type Props = {
  transactions: Transaction[];
  onSelectTransaction?: (t: Transaction) => void; // ★追加: 編集用
};

export const CalendarView = ({ transactions, onSelectTransaction }: Props) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  // ★追加: 選択された日付
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const startDay = getDay(startOfMonth(currentDate)); // 0:日, 1:月...
  
  // 日ごとの収支計算
  const getDailyData = (date: Date) => {
    const dailyTrans = transactions.filter(t => isSameDay(parseISO(t.date), date));
    const total = dailyTrans.reduce((sum, t) => sum + t.amount, 0);
    return { total, count: dailyTrans.length, transactions: dailyTrans };
  };

  // ★選択された日のデータ
  const selectedDayData = selectedDate ? getDailyData(selectedDate) : null;

  return (
    <div className="space-y-4 pb-20">
      <Card className="p-2 border-none shadow-none bg-transparent">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 text-center mb-1">
          {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
            <div key={i} className={`text-xs font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 gap-1">
          {/* 空白セル */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-14 sm:h-16" />
          ))}

          {/* 日付セル */}
          {daysInMonth.map((date) => {
            const { total, count } = getDailyData(date);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            
            return (
              <div 
                key={date.toString()}
                onClick={() => setSelectedDate(date)} // ★クリックで選択
                className={`
                  h-14 sm:h-16 border rounded-md p-1 flex flex-col justify-between cursor-pointer transition-all relative
                  ${isSelected ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300 z-10' : 'bg-white border-slate-200 hover:border-slate-400'}
                `}
              >
                <span className={`text-xs font-bold ${getDay(date) === 0 ? 'text-red-500' : getDay(date) === 6 ? 'text-blue-500' : 'text-slate-700'}`}>
                  {format(date, 'd')}
                </span>
                
                {count > 0 && (
                  <div className="text-right">
                    <div className={`text-[10px] sm:text-xs font-bold -mb-0.5 ${total >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {total > 0 ? '+' : ''}{total >= 1000 || total <= -1000 ? (total/1000).toFixed(0)+'k' : total}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ★選択された日の詳細リスト */}
      {selectedDate && selectedDayData && (
        <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
          <h3 className="text-sm font-bold text-slate-500 mb-2 px-2 flex items-center gap-2">
            {format(selectedDate, 'M月d日(E)', { locale: ja })} の記録
            <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">
              合計: {selectedDayData.total > 0 ? '+' : ''}{selectedDayData.total.toLocaleString()}
            </span>
          </h3>
          
          {selectedDayData.transactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm bg-white rounded-lg border border-dashed">
              記録はありません
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayData.transactions.map((t) => (
                <TransactionItem 
                  key={t.id} 
                  transaction={t} 
                  onClick={(target) => onSelectTransaction && onSelectTransaction(target)} 
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};