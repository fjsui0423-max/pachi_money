import React from 'react';
import { ChevronRight } from 'lucide-react';

type SelectionButtonProps = {
  label: string;
  value?: string | null;
  image?: string;          // 将来的に画像を表示する場合に使用
  icon: React.ReactNode;   // デフォルトアイコン
  placeholder: string;
  onClick: () => void;
};

export const SelectionButton = ({ 
  label, 
  value, 
  image, 
  icon, 
  placeholder, 
  onClick 
}: SelectionButtonProps) => {
  
  // 値が存在するかどうか（空文字でないか）
  const isSelected = !!value && value !== '';
  // 頭文字を取得
  const initial = (value && value.length > 0) ? value.charAt(0) : '?';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 group
        ${isSelected ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300 hover:bg-slate-100'}
      `}
    >
      {/* アイコンエリア */}
      <div className={`
        relative flex items-center justify-center w-12 h-12 rounded-full shrink-0 overflow-hidden border transition-colors
        ${isSelected ? 'bg-white border-slate-100' : 'bg-slate-200 border-transparent'}
      `}>
        {isSelected ? (
          image ? (
            <img src={image} alt={value || ''} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-slate-700 select-none">
              {initial}
            </span>
          )
        ) : (
          <div className="text-slate-400">
            {icon}
          </div>
        )}
      </div>

      {/* テキストエリア */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
          {label}
        </span>
        <span className={`
          text-sm font-bold leading-snug break-words line-clamp-2
          ${isSelected ? 'text-slate-800' : 'text-slate-400'}
        `}>
          {value || placeholder}
        </span>
      </div>

      {/* 右矢印 */}
      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors shrink-0" />
    </button>
  );
};