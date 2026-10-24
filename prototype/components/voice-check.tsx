'use client';
// 「音声テスト」: checks microphone, speaker, server and WebRTC readiness without placing an AI call
// (no cost). Results can be saved as JSON for the real-device test (docs/09).
import { useState } from 'react';
import { Modal, Support } from './ui';
import { SAY } from '@/lib/i18n';
import { checkServer, checkSupport, gatherIce, measureMic, overall, playTone, verdict, type PreflightResults } from '@/lib/voice-preflight';
import { dictationSupported, loadJapaneseVoices } from '@/lib/browser-speech';

const MARK: Record<string, string> = { ok: '✓', warn: '!', fail: '×', skipped: '–', info: 'i' };

export function VoiceCheck({ onClose, locale = 'ja' }: { onClose: () => void; locale?: string }) {
  const [results, setResults] = useState<PreflightResults>({});
  const [step, setStep] = useState<'idle' | 'checking' | 'mic' | 'speaker' | 'done'>('idle');
  const [level, setLevel] = useState(0);
  const [tonePlayed, setTonePlayed] = useState(false);
  const items = verdict(results, locale);
  const total = overall(items);

  async function start() {
    setStep('checking');
    const support = checkSupport();
    const [server, ice, jaVoices] = await Promise.all([checkServer(), support.rtc ? gatherIce() : Promise.resolve(undefined), loadJapaneseVoices()]);
    setResults((r) => ({ ...r, support, server, ...(ice ? { ice } : {}), speech: { dictation: dictationSupported(), jaVoices: jaVoices.length } }));
    setStep('mic');
  }

  async function mic() {
    setStep('checking');
    const m = await measureMic(4000, setLevel);
    setLevel(0);
    setResults((r) => ({ ...r, mic: m, speaker: { heard: null } }));
    setStep('speaker');
  }

  async function tone() {
    setTonePlayed(await playTone());
  }

  function heard(v: boolean) {
    setResults((r) => ({ ...r, speaker: { heard: v } }));
    setStep('done');
  }

  function save() {
    const report = { kind: 'care-kotoba-voice-preflight', version: 1, at: new Date().toISOString(), userAgent: navigator.userAgent, results, items, overall: total, note: 'No AI call was made. Fictional practice app; no personal data.' };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `care-kotoba-voice-check-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Modal className="voice-check-modal" onClose={onClose}>
      <div className="modal-top"><h2>音声テスト</h2><button className="icon-button" aria-label="閉じる" onClick={onClose}>×</button></div>
      <p className="voice-check-intro">AI と話す前に、マイク・スピーカー・通信を確認します。AI には接続しないので、料金はかかりません。{locale !== 'ja' && <small><Support locale={locale} t={SAY.voiceCheckIntro} /></small>}</p>
      {step === 'idle' && <button className="btn btn-primary full-width" onClick={start}>テストを始める</button>}
      {step === 'checking' && <p className="voice-check-busy" role="status">{level > 0 || results.server ? '声を出してください…' : '確認しています…'}</p>}
      {step === 'checking' && results.server && <div className="voice-meter" aria-label="マイクの音量"><i style={{ width: `${Math.round(level * 100)}%` }} /></div>}
      {step === 'mic' && <div className="voice-check-step"><p>次はマイクです。ボタンを押したら、4秒ほど「こんにちは」と話してください。</p><button className="btn btn-primary full-width" onClick={mic}>マイクを確認する</button></div>}
      {step === 'speaker' && (
        <div className="voice-check-step">
          <p>最後にスピーカーです。テスト音を鳴らして、聞こえたか教えてください。</p>
          <button className="btn btn-soft full-width" onClick={tone}>テスト音を鳴らす</button>
          {tonePlayed && <div className="voice-check-answer"><button className="btn btn-primary" onClick={() => heard(true)}>聞こえた</button><button className="btn btn-white" onClick={() => heard(false)}>聞こえない</button></div>}
        </div>
      )}
      {items.length > 0 && (
        <ul className="voice-check-list">
          {items.map((i) => <li key={i.id} data-status={i.status}><span aria-hidden="true">{MARK[i.status]}</span><div><b>{i.title}</b><p>{i.detail}</p>{i.help && <p className="voice-check-help" lang={locale === 'zh' ? 'zh-Hans' : 'en'}>{i.help}</p>}</div></li>)}
        </ul>
      )}
      {step === 'done' && (
        <div className="voice-check-step">
          <p className="voice-check-total" data-status={total}>{total === 'ok' ? '音声練習の準備ができています。' : total === 'warn' ? '注意点があります。上の内容を確認してください。' : '音声練習の前に、上の問題を確認してください。文字の練習はいつでもできます。'}</p>
          <button className="btn btn-white full-width" onClick={save}>結果を保存（JSON）</button>
        </div>
      )}
    </Modal>
  );
}
