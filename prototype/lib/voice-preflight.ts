// Voice pre-flight check: everything that can be checked on a phone BEFORE a paid Realtime call.
// Browser support, microphone permission and input level, speaker output (self-reported),
// whether the server has AI and access configured, and whether WebRTC can gather ICE candidates.
// It never calls /api/session, so it costs nothing. Used by components/voice-check.tsx and by the
// real-device test plan (docs/09). The verdict logic is pure and unit-tested.

export type CheckStatus = 'ok' | 'warn' | 'fail' | 'skipped';
export type CheckItem = { id: string; status: CheckStatus; title: string; detail: string; key: string; help?: string };

// Learner-language help for each message (the Japanese detail stays the main text).
const HELP: Record<string, { zh: string; en: string }> = {
  'support.fail': { zh: '浏览器缺少语音练习需要的功能。请用最新版 Safari 或 Chrome 打开 https 网址。文字练习仍可使用。', en: 'This browser lacks features voice practice needs. Use the latest Safari or Chrome on an https address. Text practice still works.' },
  'support.ok': { zh: '浏览器支持语音练习。', en: 'This browser supports voice practice.' },
  'server.unreachable': { zh: '连不上服务器，请检查网络。', en: 'The server cannot be reached. Check your connection.' },
  'server.noai': { zh: '服务器还没有设置 AI，目前只能用演示。', en: 'AI is not set up on the server yet; only the demo works.' },
  'server.code': { zh: 'AI 练习需要访问码，开始练习时可以输入。', en: 'AI practice needs an access code; you can enter it when you start.' },
  'server.slow': { zh: '服务器响应较慢，对话回复也可能变慢。', en: 'The server is slow to answer; replies may be slow too.' },
  'server.ok': { zh: '已连上服务器。', en: 'Connected to the server.' },
  'ice.error': { zh: '无法准备语音通信（WebRTC）。', en: 'Voice connection (WebRTC) could not be prepared.' },
  'ice.none': { zh: '找不到可用的网络通道。请检查 VPN 或公司网络的限制。', en: 'No network path was found. Check for VPN or company network restrictions.' },
  'ice.ok': { zh: '找到了网络通道。真正的连接要在 AI 练习时才能确认。', en: 'A network path was found. The real connection is checked during AI practice.' },
  'mic.denied': { zh: '麦克风未被允许，请在浏览器设置中允许。', en: 'Microphone access is blocked. Allow it in the browser settings.' },
  'mic.missing': { zh: '找不到麦克风。', en: 'No microphone was found.' },
  'mic.error': { zh: '无法使用麦克风。', en: 'The microphone cannot be used.' },
  'mic.quiet': { zh: '几乎没有收到声音。请一边说话一边再试一次，并检查是否静音或选错了麦克风。', en: 'Almost no sound came in. Try again while speaking, and check mute or the selected microphone.' },
  'mic.ok': { zh: '麦克风能收到声音。', en: 'The microphone picks up your voice.' },
  'speaker.ok': { zh: '听到了测试音。', en: 'You heard the test sound.' },
  'speaker.fail': { zh: '听不到声音。请检查音量、静音模式和连接的耳机。', en: 'No sound. Check the volume, silent mode and connected earphones.' },
  'speaker.skipped': { zh: '还没有确认。', en: 'Not checked yet.' },
};

function withHelp(items: Omit<CheckItem, 'help'>[], locale: string): CheckItem[] {
  return items.map((i) => ({ ...i, ...(locale === 'zh' || locale === 'en' ? { help: HELP[i.key]?.[locale] } : {}) }));
}

export type PreflightResults = {
  support?: { secureContext: boolean; getUserMedia: boolean; rtc: boolean; audioContext: boolean };
  server?: { reachable: boolean; ms?: number; aiConfigured?: boolean; accessRequired?: boolean; accessGranted?: boolean; realtimeModel?: string; maxSeconds?: number };
  ice?: { total: number; host: number; srflx: number; relay: number; ms: number; error?: string };
  mic?: { granted: boolean; error?: string; peak?: number; label?: string };
  speaker?: { heard: boolean | null };
};

/** Pure: turn raw results into the list shown to the learner/tester (Japanese, plus help in zh/en). */
export function verdict(r: PreflightResults, locale = 'ja'): CheckItem[] {
  const out: Omit<CheckItem, 'help'>[] = [];
  const s = r.support;
  if (s) {
    const missing = [!s.secureContext && 'HTTPS', !s.getUserMedia && 'マイクAPI', !s.rtc && 'WebRTC', !s.audioContext && 'Web Audio'].filter(Boolean);
    out.push(missing.length
      ? { id: 'support', key: 'support.fail', status: 'fail', title: 'ブラウザの対応', detail: `${missing.join('・')} が使えません。Safari または Chrome の最新版で、https のページを開いてください。文字の練習はできます。` }
      : { id: 'support', key: 'support.ok', status: 'ok', title: 'ブラウザの対応', detail: '音声練習に必要な機能があります。' });
  }
  const v = r.server;
  if (v) {
    if (!v.reachable) out.push({ id: 'server', key: 'server.unreachable', status: 'fail', title: 'サーバー', detail: 'サーバーに接続できません。通信環境を確認してください。' });
    else if (v.aiConfigured === false) out.push({ id: 'server', key: 'server.noai', status: 'warn', title: 'サーバー', detail: 'AI がまだ設定されていません。デモ練習のみ使えます。' });
    else if (v.accessRequired && !v.accessGranted) out.push({ id: 'server', key: 'server.code', status: 'warn', title: 'サーバー', detail: 'AI 練習にはアクセスコードが必要です。練習を始めるときに入力できます。' });
    else out.push({ id: 'server', key: (v.ms ?? 0) > 1500 ? 'server.slow' : 'server.ok', status: (v.ms ?? 0) > 1500 ? 'warn' : 'ok', title: 'サーバー', detail: `接続できました（${v.ms ?? '?'} ms）。${(v.ms ?? 0) > 1500 ? '応答が遅めです。会話の返事も遅れるかもしれません。' : ''}` });
  }
  const i = r.ice;
  if (i) {
    if (i.error) out.push({ id: 'ice', key: 'ice.error', status: 'fail', title: '音声の通信準備', detail: `WebRTC を準備できませんでした（${i.error}）。` });
    else if (i.total === 0) out.push({ id: 'ice', key: 'ice.none', status: 'fail', title: '音声の通信準備', detail: '通信経路の候補が見つかりません。VPN や社内ネットワークの制限がないか確認してください。' });
    else out.push({ id: 'ice', key: 'ice.ok', status: 'ok', title: '音声の通信準備', detail: `通信経路の候補が見つかりました（${i.total} 件）。実際の接続は AI 練習で確認されます。` });
  }
  const m = r.mic;
  if (m) {
    if (!m.granted) out.push({ id: 'mic', key: m.error === 'NotAllowedError' ? 'mic.denied' : m.error === 'NotFoundError' ? 'mic.missing' : 'mic.error', status: 'fail', title: 'マイク', detail: m.error === 'NotAllowedError' ? 'マイクが許可されていません。ブラウザの設定で許可してください。' : m.error === 'NotFoundError' ? 'マイクが見つかりません。' : `マイクを使えません（${m.error || '不明'}）。` });
    else if ((m.peak ?? 0) < 0.02) out.push({ id: 'mic', key: 'mic.quiet', status: 'warn', title: 'マイク', detail: '音がほとんど入っていません。もう一度、声を出しながら試してください。ミュートや別のマイクが選ばれていないかも確認してください。' });
    else out.push({ id: 'mic', key: 'mic.ok', status: 'ok', title: 'マイク', detail: `声が入っています${m.label ? `（${m.label}）` : ''}。` });
  }
  const p = r.speaker;
  if (p) {
    out.push(p.heard === true ? { id: 'speaker', key: 'speaker.ok', status: 'ok', title: 'スピーカー', detail: 'テスト音が聞こえました。' }
      : p.heard === false ? { id: 'speaker', key: 'speaker.fail', status: 'fail', title: 'スピーカー', detail: '音が聞こえません。音量、マナーモード、接続中のイヤホンを確認してください。' }
      : { id: 'speaker', key: 'speaker.skipped', status: 'skipped', title: 'スピーカー', detail: 'まだ確認していません。' });
  }
  return withHelp(out, locale);
}

export function overall(items: CheckItem[]): CheckStatus {
  if (items.some((i) => i.status === 'fail')) return 'fail';
  if (items.some((i) => i.status === 'warn' || i.status === 'skipped')) return 'warn';
  return items.length ? 'ok' : 'skipped';
}

// ---- Browser probes (not unit-tested; covered by e2e with Chromium's fake devices) -----------

export function checkSupport(): NonNullable<PreflightResults['support']> {
  const w = globalThis as unknown as { isSecureContext?: boolean; RTCPeerConnection?: unknown; AudioContext?: unknown; webkitAudioContext?: unknown };
  return {
    secureContext: w.isSecureContext !== false,
    getUserMedia: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
    rtc: typeof w.RTCPeerConnection === 'function',
    audioContext: typeof (w.AudioContext || w.webkitAudioContext) === 'function',
  };
}

export async function checkServer(): Promise<NonNullable<PreflightResults['server']>> {
  const t0 = performance.now();
  try {
    const [h, a] = await Promise.all([
      fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(8000) }),
      fetch('/api/access', { cache: 'no-store', signal: AbortSignal.timeout(8000) }),
    ]);
    const ms = Math.round(performance.now() - t0);
    const health = (await h.json().catch(() => null)) as { configured?: boolean; models?: { realtime?: string }; voice?: { maxSeconds?: number } } | null;
    const access = (await a.json().catch(() => null)) as { required?: boolean; granted?: boolean } | null;
    return { reachable: h.ok, ms, aiConfigured: health?.configured, accessRequired: !!access?.required, accessGranted: !!access?.granted, realtimeModel: health?.models?.realtime, maxSeconds: health?.voice?.maxSeconds };
  } catch {
    return { reachable: false };
  }
}

/** Gathers local ICE candidates without any server (no STUN/TURN configured, no call placed). */
export async function gatherIce(timeoutMs = 2500): Promise<NonNullable<PreflightResults['ice']>> {
  const t0 = performance.now();
  let pc: RTCPeerConnection | null = null;
  try {
    pc = new RTCPeerConnection();
    pc.createDataChannel('preflight');
    const counts = { total: 0, host: 0, srflx: 0, relay: 0 };
    const done = new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      pc!.onicecandidate = (e) => {
        if (!e.candidate) { clearTimeout(timer); resolve(); return; }
        counts.total++;
        const type = (e.candidate.type || /typ (\w+)/.exec(e.candidate.candidate)?.[1] || '') as string;
        if (type === 'host') counts.host++; else if (type === 'srflx') counts.srflx++; else if (type === 'relay') counts.relay++;
      };
    });
    await pc.setLocalDescription(await pc.createOffer());
    await done;
    return { ...counts, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { total: 0, host: 0, srflx: 0, relay: 0, ms: Math.round(performance.now() - t0), error: (e as Error)?.name || 'error' };
  } finally {
    try { pc?.close(); } catch {}
  }
}

type AudioCtor = new () => AudioContext;
const audioCtor = (): AudioCtor | null => {
  const w = globalThis as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext || w.webkitAudioContext || null;
};

/** Opens the microphone for `ms`, reports the peak level (0..1) through onLevel, then releases it. */
export async function measureMic(ms: number, onLevel: (level: number) => void): Promise<NonNullable<PreflightResults['mic']>> {
  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const Ctor = audioCtor();
    if (!Ctor) return { granted: true, label: stream.getAudioTracks()[0]?.label };
    ctx = new Ctor();
    await ctx.resume().catch(() => {});
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    let peak = 0;
    const until = performance.now() + ms;
    while (performance.now() < until) {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const x of buf) sum += x * x;
      const rms = Math.sqrt(sum / buf.length);
      peak = Math.max(peak, rms);
      onLevel(Math.min(1, rms * 4));
      await new Promise((r) => setTimeout(r, 80));
    }
    return { granted: true, peak: Math.round(peak * 1000) / 1000, label: stream.getAudioTracks()[0]?.label };
  } catch (e) {
    return { granted: false, error: (e as Error)?.name || 'error' };
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
    await ctx?.close().catch(() => {});
  }
}

/** Plays a short, quiet two-tone chime on the current output (call from a tap). */
export async function playTone(): Promise<boolean> {
  const Ctor = audioCtor();
  if (!Ctor) return false;
  const ctx = new Ctor();
  try {
    await ctx.resume().catch(() => {});
    const gain = ctx.createGain();
    gain.gain.value = 0.12;
    gain.connect(ctx.destination);
    for (const [freq, start] of [[660, 0], [880, 0.35]] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.3);
    }
    await new Promise((r) => setTimeout(r, 800));
    return true;
  } catch {
    return false;
  } finally {
    await ctx.close().catch(() => {});
  }
}
