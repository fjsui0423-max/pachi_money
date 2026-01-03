import Link from 'next/link';

export const Footer = () => {
  return (
    // フッターの高さ確保のため pb-24 を設定（前回の修正を維持）
    <footer className="w-full bg-white border-t border-slate-100 pt-6 pb-24 mt-8">
      <div className="max-w-md mx-auto px-4 flex flex-col items-center gap-4 text-xs text-slate-500">
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-slate-800 hover:underline">
            利用規約
          </Link>
          <Link href="/privacy" className="hover:text-slate-800 hover:underline">
            プライバシーポリシー
          </Link>
          {/* ★追加: お問い合わせリンク */}
          <a href="mailto:pachimoney.info@gmail.com" className="hover:text-slate-800 hover:underline">
            お問い合わせ
          </a>
        </div>
        <p>&copy; {new Date().getFullYear()} Pachi-Money</p>
      </div>
    </footer>
  );
};