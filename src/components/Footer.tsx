import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="w-full bg-white border-t border-slate-100 py-6 mt-8">
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