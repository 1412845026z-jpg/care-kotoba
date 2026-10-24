'use client';
// 「この場面だけもう一度」: local re-practice of ONE moment from the conversation (CLAUDE.md:
// feedback should support 局部复练). The partner's line just before the learner's original words is
// shown again; the learner answers once more and the AI partner reacts to that answer only, with
// the conversation up to that moment as context. Uses the normal /api/chat route.
import { useState } from 'react';
import { JaText } from './ruby';
import {Support} from './ui';
import { type DrillMessage } from '@/lib/drill';
export { contextBefore } from '@/lib/drill';

type ChatReply = { reply: string; ruby?: string; translation?: string; correction: { original: string; better: string; reason: string } | null };

export function LineDrill(props: {
  sceneId: string; variant: string; locale: string; level: string; furigana: boolean;
  context: DrillMessage[]; original: string; better: string; partnerName: string;
  onClose: () => void; onAccessRequired?: () => void;
}) {
  const { context, original, better, locale } = props;
  const partnerLine = [...context].reverse().find((m) => m.role === 'assistant');
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ChatReply | null>(null);
  const [tries, setTries] = useState(0);
  const [error, setError] = useState('');

  async function submit() {
    const t = answer.trim();
    if (!t || busy) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenarioId: props.sceneId, variant: props.variant, locale, level: props.level, messages: [...context.map((m) => ({ role: m.role, text: m.text })), { role: 'user', text: t }] }) });
      const j = (await r.json().catch(() => ({}))) as ChatReply & { error?: string; code?: string };
      if (!r.ok) { if (j.code === 'access_required') props.onAccessRequired?.(); throw new Error(j.error || '接続できませんでした。'); }
      setResult(j);
      setTries((n) => n + 1);
    } catch (e) {
      setError((e as Error).message || '接続できませんでした。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="line-drill" aria-label="この場面だけもう一度">
      <div className="line-drill-head"><h3>この場面だけ、もう一度</h3><button className="icon-button" aria-label="閉じる" onClick={props.onClose}>×</button></div>
      <p className="line-drill-help"><Support locale={locale} zh={'只重练这一句：看对方的话，再回答一次。'} en={'Replay just this moment: read the partner’s line and answer again.'} ja={'相手のことばを見て、もう一度だけ答えてみましょう。'}/></p>
      {partnerLine ? <div className="line-drill-partner"><small>{props.partnerName}</small><p><JaText text={partnerLine.text} on={props.furigana} /></p></div> : <p className="line-drill-help">（会話のはじめの一言です）</p>}
      <div className="line-drill-before"><small>さっきのあなた</small><p>{original}</p></div>
      <button className="text-button" aria-expanded={hint} onClick={() => setHint(!hint)}>{hint ? 'ヒントを隠す' : 'ヒントを見る'}</button>
      {hint && <p className="line-drill-hint">{better}</p>}
      <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={600} rows={2} aria-label="もう一度、日本語で答える" placeholder="日本語で、もう一度答えてみましょう…" />
      <button className="btn btn-primary full-width" disabled={!answer.trim() || busy} onClick={submit}>{busy ? '相手が考えています…' : '答える'}</button>
      {error && <p className="line-drill-error" role="alert">{error}</p>}
      {result && (
        <div className="line-drill-result" role="status">
          <small>{props.partnerName}の返事</small>
          <p><JaText text={result.reply} ruby={result.ruby} on={props.furigana} /></p>
          {result.correction
            ? <div className="line-drill-correction"><small>こんな言い方も</small><b>{result.correction.better}</b><p>{result.correction.reason}</p></div>
            : <p className="line-drill-ok">伝わりました。<Support locale={locale} zh={'（这次没有需要修改的地方。）'} en={'(Nothing to correct this time.)'}/></p>}
          <button className="btn btn-white full-width" onClick={() => { setAnswer(''); setResult(null); }}>{tries >= 1 ? 'もう一度ちがう言い方で' : 'もう一度'}</button>
        </div>
      )}
    </section>
  );
}
