'use client';
// LEGAL-UI-001: 「ライセンスとデータの扱い」. Plain facts about where data goes in this prototype and the
// open-source notices of what reaches the device (data: lib/notices-data.ts, loaded on demand).
// Not a privacy policy or terms of use: those are written before release and checked by professionals.
import {useEffect,useState} from 'react';
import {ArrowLeft} from 'lucide-react';
import type {Notice} from '@/lib/notices-data';
import {Support} from './ui';

const FLOWS:{title:string;where:string;text:string;zh:string}[]=[
 {title:'ことばノート・練習の記録・復習・基礎の練習済み・学習設定',where:'この端末だけ',text:'この端末（ブラウザ）の中に保存します。サーバーには送りません。設定の「この端末の学習データを削除」で消せます。',zh:'只保存在这台设备的浏览器里，不发送到服务器；可在设置中删除。'},
 {title:'AIと文字で練習・振り返り・この場面だけもう一度',where:'OpenAI（米国）',text:'入力した文と会話の内容を、本アプリのサーバーを通して OpenAI の API に送り、返答と振り返りを作ります。本アプリのサーバーには会話の内容を保存しません。',zh:'输入的句子和对话内容会经本应用服务器发送给 OpenAI（美国）的 API，用来生成回复和反馈；本应用服务器不保存对话内容。'},
 {title:'AIと音声で練習',where:'OpenAI（米国）',text:'声は OpenAI のリアルタイム音声 API に直接送られ、文字にされます。本アプリは録音を保存しません。開始・終了の時刻などの技術的な記録（会話の内容は含みません）がサーバーに残ります。',zh:'声音直接发送给 OpenAI 的实时语音 API 并转成文字；本应用不保存录音。服务器会留下开始、结束时间等技术记录（不含对话内容）。'},
 {title:'声で入力（ブラウザの音声認識）',where:'ブラウザの提供元',text:'声はブラウザの提供元（Google・Apple など）のサーバーで処理されることがあります。使う前に確認します。Care Kotoba に届くのは文字だけです。',zh:'声音可能由浏览器提供商（Google、Apple 等）的服务器处理；使用前会先确认。Care Kotoba 只收到文字。'},
 {title:'読み上げ',where:'この端末 / OpenAI',text:'基礎の声かけは、この端末の日本語の音声で読み上げます（端末の音声サービスが外部で処理する場合があります）。AIの場面の「ゆっくり聞く」は、サーバーの音声合成が使えるときは文を OpenAI に送ります。',zh:'基础课用设备自带的日语语音朗读；AI 场景的「ゆっくり聞く」在服务器语音合成可用时会把句子发送给 OpenAI。'},
 {title:'文字（フォント）',where:'Google Fonts',text:'表示用の文字を Google Fonts から読み込むため、端末の IP アドレスなどが Google に送られます。',zh:'字体从 Google Fonts 加载，因此设备的 IP 地址等信息会发送给 Google。'},
 {title:'配信',where:'Cloudflare',text:'アプリは Cloudflare のサーバーから配信します。通信の記録が残ることがあります。',zh:'应用由 Cloudflare 的服务器提供，可能留下访问记录。'},
 {title:'広告・アクセス解析',where:'なし',text:'使っていません。',zh:'没有使用广告或访问分析。'},
 {title:'法人での利用（試作版の画面はサンプル）',where:'—',text:'学習者の録音を雇用主に見せる機能はありません。法人の画面はサンプルのデータです。',zh:'没有向雇主提供学员录音的功能；法人画面是示例数据。'},
];

export function AboutView({locale,onBack}:{locale:string;onBack:()=>void}){
 const [notices,setNotices]=useState<Notice[]|null>(null);
 useEffect(()=>{import('@/lib/notices-data').then(m=>setNotices(m.NOTICES)).catch(()=>setNotices([]));},[]);
 return <main className="wide-main about-main">
  <button className="text-button basic-back" onClick={onBack}><ArrowLeft size={15}/>もどる</button>
  <section className="page-title"><h1 tabIndex={-1}>ライセンスとデータの扱い</h1><p>この試作版で、データがどこに送られるかと、使っているオープンソースの一覧です。正式な利用規約とプライバシーポリシーは、公開の前に作り、専門家の確認を受けます。<Support locale={locale} zh="（说明本试作版的数据去向和使用的开源软件。正式的用户条款和隐私政策会在公开前制定，并请专业人士确认。）" en="(Where data goes in this prototype, and the open-source software it uses. Formal terms and a privacy policy will be written and professionally reviewed before release.)"/></p></section>
  <section className="about-section" aria-labelledby="about-data"><h2 id="about-data">データの扱い（試作版）</h2>
   <ul className="about-flows">{FLOWS.map(f=><li key={f.title}><div className="about-flow-head"><b>{f.title}</b><span>{f.where}</span></div><p>{f.text}</p>{locale==='zh'&&<p className="about-zh" lang="zh-Hans">{f.zh}</p>}</li>)}</ul>
  </section>
  <section className="about-section" aria-labelledby="about-oss"><h2 id="about-oss">オープンソース</h2>
   <p className="about-note">端末に届くプログラム・文字・データに含まれるものです。サーバーだけで使うものと開発用の道具は、リポジトリの docs/07 にあります。</p>
   {!notices?<p className="about-note">読み込んでいます…</p>:<ul className="about-notices">{notices.map(n=><li key={n.name}><details><summary><span><b>{n.name}</b> <small>{n.version}</small></span><span className="about-license">{n.license}</span></summary><p className="about-role">{n.roleJa}</p><p className="about-url" translate="no">{n.url}</p><pre lang="en" translate="no">{n.text}</pre></details></li>)}</ul>}
  </section>
 </main>;
}
