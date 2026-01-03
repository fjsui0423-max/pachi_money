import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { Footer } from "@/components/Footer";

// この行が抜けておりました
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pachi-Money | パチスロ収支共有・分析アプリ",
  description: "パチスロや投資の収支をグループで共有・分析できる無料の家計簿アプリ。グラフ分析やカレンダー機能で収支管理をサポートします。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* AdSense審査用コード (XXXXXXXXXXは実際のIDに置き換えてください) */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}