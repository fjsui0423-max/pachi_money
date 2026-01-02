import React from 'react';
import { Transaction } from '@/types';
import { Card } from '@/components/ui/card';
import { Store, Gamepad2, CalendarDays } from 'lucide-react'; // アイコン追加
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

type Props = {
  transaction: Transaction;
  onClick: (t: Transaction) => void;
};

export const TransactionItem = ({ transaction, onClick }: Props) => {
  const fmt = (num: number) => num.toLocaleString();
  const isWin = transaction.amount >= 0;
  const balanceColor = isWin ? 'text-blue-600' : 'text-red-500';
  const balanceSign = isWin ? '+' : '';

  // 日付フォーマット (例: 1/15(水))
  const dateObj = parseISO(transaction.date);
  const dateStr = format(dateObj, 'M/d(E)', { locale: ja });

  return (
    <Card 
      className="p-3 mb-2 cursor-pointer hover:bg-gray-50 transition-colors active:scale-[0.98]"
      onClick={() => onClick(transaction)}
    >
      <div className="flex flex-col gap-1">
        
        {/* 上段: 日付・機種名・収支 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 overflow-hidden">
            {/* 日付バッジ */}
            <div className="flex items-center text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
              {dateStr}
            </div>
            
            <div className="flex items-center gap-1 overflow-hidden">
              <Gamepad2 className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="font-bold text-gray-800 truncate text-sm sm:text-base">
                {transaction.machine_name || '機種名なし'}
              </span>
            </div>
          </div>
          <span className={`font-mono font-bold text-lg ${balanceColor} shrink-0 ml-2`}>
            {balanceSign}¥{fmt(transaction.amount)}
          </span>
        </div>

        {/* 下段: 店舗名と投資/回収 */}
        <div className="flex justify-between items-end text-xs text-gray-500 mt-1">
          <div className="flex items-center gap-1 max-w-[50%]">
            <Store className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="truncate">
              @{transaction.shop_name || '店舗未設定'}
            </span>
          </div>
          <div className="flex gap-2 font-mono">
            <span>投:¥{fmt(transaction.investment)}</span>
            <span>回:¥{fmt(transaction.recovery)}</span>
          </div>
        </div>

      </div>
    </Card>
  );
};