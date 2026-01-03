import Link from 'next/link';

export const Footer = () => {
  return (
    // 修正: py-6 を pt-6 pb-24 に変更して下部に大きな余白(約96px)を確保
    <footer className="w-full bg-white border-t border-slate-100 pt-6 pb-24 mt-8">
      <div className="max-w-md mx-auto px-4 flex flex-col items-center gap-4 text-xs text-slate-500">
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-slate-800 hover:underline">
            利用規約
          </Link>
          <Link href="/privacy" className="hover:text-slate-800 hover:underline">
            プライバシーポリシー
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Pachi-Money</p>
      </div>
    </footer>
  );
};