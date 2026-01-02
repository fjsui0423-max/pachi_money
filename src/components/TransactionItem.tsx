"use client";

import React, { useEffect, useState } from 'react';
import { Transaction } from '@/types';
import { Card } from '@/components/ui/card';
import { Store, Gamepad2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // 追加
import { supabase } from '@/lib/supabase';

type Props = {
  transaction: Transaction;
  onClick: (t: Transaction) => void;
};

export const TransactionItem = ({ transaction, onClick }: Props) => {
  const fmt = (num: number) => num.toLocaleString();
  const isWin = transaction.amount >= 0;
  const balanceColor = isWin ? 'text-blue-600' : 'text-red-500';
  const balanceSign = isWin ? '+' : '';

  const dateObj = parseISO(transaction.date);
  const dateStr = format(dateObj, 'M/d(E)', { locale: ja });

  // ユーザー情報
  // @ts-ignore
  const userName = transaction.profiles?.username || '不明';
  // @ts-ignore
  const avatarPath = transaction.profiles?.avatar_url;

  // アバター画像のURL取得
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (avatarPath) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath);
      setAvatarUrl(data.publicUrl);
    }
  }, [avatarPath]);

  return (
    <Card 
      className="p-3 mb-2 cursor-pointer hover:bg-gray-50 transition-colors active:scale-[0.98]"
      onClick={() => onClick(transaction)}
    >
      <div className="flex flex-col gap-1">
        
        {/* 上段 */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1 overflow-hidden">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {dateStr}
              </span>
              
              {/* ★アイコン表示 */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-full pr-2 py-0.5 pl-0.5">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={avatarUrl || ''} />
                  <AvatarFallback className="text-[8px] bg-slate-200">
                    {userName.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[80px] text-slate-600 font-bold">{userName}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 overflow-hidden mt-0.5">
              <Gamepad2 className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="font-bold text-gray-800 truncate text-sm sm:text-base">
                {transaction.machine_name || '機種名なし'}
              </span>
            </div>
          </div>

          <span className={`font-mono font-bold text-lg ${balanceColor} shrink-0 ml-2 mt-1`}>
            {balanceSign}¥{fmt(transaction.amount)}
          </span>
        </div>

        {/* 下段 */}
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