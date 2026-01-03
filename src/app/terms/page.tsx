import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 py-8 safe-area-padding">
      <Card className="shadow-none border-0 bg-transparent">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center mb-4">利用規約</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <p>
            この利用規約（以下，「本規約」といいます。）は，Pachi-Money運営者（以下，「運営者」といいます。）がこのウェブサイト上で提供するサービス（以下，「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下，「ユーザー」といいます。）には，本規約に従って，本サービスをご利用いただきます。
          </p>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">第1条（適用）</h2>
            <p>本規約は，ユーザーと運営者との間の本サービスの利用に関わる一切の関係に適用されるものとします。</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">第2条（利用登録）</h2>
            <p>登録希望者が運営者の定める方法によって利用登録を申請し，運営者がこれを承認することによって，利用登録が完了するものとします。</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">第3条（ユーザーIDおよびパスワードの管理）</h2>
            <p>ユーザーは，自己の責任において，本サービスのユーザーIDおよびパスワードを適切に管理するものとします。</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">第4条（禁止事項）</h2>
            <p>ユーザーは，本サービスの利用にあたり，以下の行為をしてはなりません。</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>本サービスの内容等，本サービスに含まれる著作権，商標権ほか知的財産権を侵害する行為</li>
              <li>運営者，ほかのユーザー，またはその他第三者のサーバーまたはネットワークの機能を破壊したり，妨害したりする行為</li>
              <li>本サービスの運営を妨害するおそれのある行為</li>
              <li>不正アクセスをし，またはこれを試みる行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>本サービスに関連して，反社会的勢力に対して直接または間接に利益を供与する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">第5条（本サービスの提供の停止等）</h2>
            <p>
              運営者は，以下のいずれかの事由があると判断した場合，ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
              <li>地震，落雷，火災，停電または天災などの不可抗力により，本サービスの提供が困難となった場合</li>
              <li>その他，運営者が本サービスの提供が困難と判断した場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">第6条（免責事項）</h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>運営者は，本サービスに事実上または法律上の瑕疵（安全性，信頼性，正確性，完全性，有効性，特定の目的への適合性，セキュリティなどに関する欠陥，エラーやバグ，権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。</li>
              <li>運営者は，本サービスに起因してユーザーに生じたあらゆる損害について、一切の責任を負いません。</li>
              <li>本サービスはパチンコ・パチスロ等の収支を記録・管理するためのツールであり、ユーザーの投資結果や利益を保証するものではありません。ギャンブルや投資による損失について、運営者は一切関知せず、責任を負いません。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">第7条（利用規約の変更）</h2>
            <p>運営者は，必要と判断した場合には，ユーザーに通知することなくいつでも本規約を変更することができるものとします。</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">第8条（準拠法・裁判管轄）</h2>
            <p>本規約の解釈にあたっては，日本法を準拠法とします。本サービスに関して紛争が生じた場合には，運営者の所在地を管轄する裁判所を専属的合意管轄とします。</p>
          </section>
          
          <div className="pt-8 text-right text-xs text-slate-500">
            <p>制定日: 2026年1月3日</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}