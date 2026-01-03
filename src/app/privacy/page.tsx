import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 py-8 safe-area-padding">
      <Card className="shadow-none border-0 bg-transparent">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center mb-4">プライバシーポリシー</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <p>
            Pachi-Money運営者（以下，「運営者」といいます。）は，本ウェブサイト上で提供するサービス（以下，「本サービス」といいます。）における，ユーザーの個人情報の取扱いについて，以下のとおりプライバシーポリシー（以下，「本ポリシー」といいます。）を定めます。
          </p>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. 個人情報の収集について</h2>
            <p>
              運営者は、ユーザーが利用登録をする際にメールアドレスなどの個人情報をお尋ねすることがあります。また、ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を、運営者の提携先（情報提供元、広告主、広告配信先などを含みます。以下、｢提携先｣といいます。）などから収集することがあります。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. 個人情報の利用目的</h2>
            <p>本サービスの提供・運営のため、ユーザーからのお問い合わせに回答するため、重要なお知らせなど必要に応じたご連絡のため、利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をし、ご利用をお断りするため。</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. 広告の配信について（Google AdSense）</h2>
            <p>
              当サイトでは、第三者配信の広告サービス「Google Adsense（グーグルアドセンス）」を利用しています。
            </p>
            <p className="mt-2">
              Googleなどの第三者配信事業者は、Cookieを使用し、ユーザーが当サイトや他のウェブサイトに過去にアクセスした際の情報に基づいて広告を配信します。<br />
              ユーザーは、<a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">広告設定</a>でパーソナライズ広告を無効にすることができます。また、<a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">www.aboutads.info</a>にアクセスすれば、パーソナライズ広告に使われる第三者配信事業者の Cookie を無効にすることができます。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. アクセス解析ツールについて</h2>
            <p>
              当サイトでは、Googleによるアクセス解析ツール「Googleアナリティクス」を利用しています。
              このGoogleアナリティクスはトラフィックデータの収集のためにCookieを使用しています。このトラフィックデータは匿名で収集されており、個人を特定するものではありません。
              この機能はCookieを無効にすることで収集を拒否することが出来ますので、お使いのブラウザの設定をご確認ください。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">5. お問い合わせ窓口</h2>
            <p>本ポリシーに関するお問い合わせは，下記の窓口までお願いいたします。</p>
            <p className="mt-2 font-mono bg-slate-100 p-2 rounded">
              Pachi-Money 運営担当<br />
              Eメールアドレス: [pachimoney.info@gmail.com]<br />
              {/* または GoogleフォームのURLなど */}
            </p>
          </section>

          <div className="pt-8 text-right text-xs text-slate-500">
            <p>制定日: 2026年1月3日</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}