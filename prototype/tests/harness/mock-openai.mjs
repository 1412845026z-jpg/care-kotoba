// Deterministic stand-in for the parts of the OpenAI API that Care Kotoba uses.
// It never calls OpenAI and never costs money. Responses are canned, so tests
// built on it verify OUR request/response handling and UI, not AI quality.
import { createServer } from 'node:http';

function wav(seconds = 0.3, rate = 8000) {
  const n = Math.floor(seconds * rate), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  return b;
}

const conversationReplies = ['そうなのね。もう少し、ゆっくり説明してもらえる？', 'わかったわ。それなら、少ししてからでもいいかしら。', 'ありがとう。私の気持ちも聞いてくれて、うれしいわ。'];

export function createMockOpenAI() {
  const state = {
    requests: [],
    scenario: { quoteMode: 'exact', error: null, pronunciation: false },
    onRealtimeCall: null, // async ({ sdp, session }) => ({ sdp, callId })
    hangups: [],
  };
  const output = (obj) => ({ id: 'resp_mock', status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(obj) }] }] });

  async function handle(req) {
    const url = new URL(req.url);
    const auth = req.headers.get('authorization') || '';
    const record = { method: req.method, path: url.pathname, hasAuth: auth.startsWith('Bearer '), at: Date.now() };
    state.requests.push(record);
    if (!record.hasAuth) return Response.json({ error: { code: 'invalid_api_key', message: 'missing key' } }, { status: 401 });
    if (state.scenario.error) { const e = state.scenario.error; return Response.json({ error: { code: e.code, message: 'mock error' } }, { status: e.status }); }

    if (url.pathname === '/v1/responses' && req.method === 'POST') {
      const body = await req.json();
      record.body = body;
      const kind = body?.text?.format?.name;
      if (kind === 'care_conversation') {
        const userTurns = (body.input || []).filter((m) => m.role === 'user').length;
        const last = [...(body.input || [])].reverse().find((m) => m.role === 'user')?.content || '';
        return Response.json(output({
          reply: conversationReplies[Math.min(Math.max(userTurns - 1, 0), 2)],
          translation: '（模拟翻译）' + conversationReplies[Math.min(Math.max(userTurns - 1, 0), 2)].slice(0, 8),
          correction: userTurns === 1 && last ? { original: last, better: last.replace(/。?$/, '') + 'ませんか。', reason: '（模拟）丁寧な依頼の形にすると伝わりやすくなります。' } : null,
          suggestions: ['今は、どのようなお気持ちですか。', 'ご希望を担当の職員と確認してまいります。'],
          finished: userTurns >= 3,
        }));
      }
      if (kind === 'care_feedback') {
        let messages = [];
        try { messages = JSON.parse(body.input); } catch {}
        const learner = (Array.isArray(messages) ? messages : (messages.messages || [])).filter((m) => m.role === 'user').map((m) => m.text);
        const first = learner[0] || '';
        const improvements = [];
        if (state.scenario.quoteMode !== 'fabricated' && first) improvements.push({ original: first, better: '今日は、入りたくないお気持ちなのですね。', reason: '（模拟）相手の気持ちをそのまま受け止める言い方です。' });
        if (state.scenario.quoteMode !== 'exact') improvements.push({ original: '早くお風呂に入ってください。', better: '入浴について、ご希望を伺ってもよろしいですか。', reason: '（模拟）この文は学習者が言っていない捏造引用です。' });
        // pronunciation=true: the model (wrongly) judges pronunciation from text; the server must remove it.
        const p = state.scenario.pronunciation;
        if (p && first) improvements.push({ original: first, better: first, reason: '（模拟）「入りたくない」の発音が不明瞭です。' });
        return Response.json(output({
          score: 72, heading: '（模拟）気持ちを確かめる一言が言えました', summary: '（模拟フィードバック）これはテスト用の固定応答です。' + (p ? '発音もとてもきれいでした。' : ''),
          strengths: ['（模拟）丁寧な言葉づかい', ...(p ? ['（模拟）发音很清楚。'] : [])], improvements,
          goals: [{ label: '相手の希望・気持ちを確かめる', achieved: true, evidence: first ? `「${first.slice(0, 20)}」` : '' }],
          nextPhrase: '今は、どのようなお気持ちですか。',
        }));
      }
      return Response.json({ error: { code: 'unknown_format' } }, { status: 400 });
    }
    if (url.pathname === '/v1/audio/speech' && req.method === 'POST') {
      record.body = await req.json();
      return new Response(wav(), { headers: { 'content-type': 'audio/wav' } });
    }
    if (url.pathname === '/v1/realtime/calls' && req.method === 'POST') {
      const form = await req.formData();
      const sdp = String(form.get('sdp') || '');
      let session = null;
      try { session = JSON.parse(String(form.get('session') || 'null')); } catch {}
      record.body = { session, sdpLength: sdp.length };
      if (!state.onRealtimeCall) return Response.json({ error: { code: 'mock_no_peer', message: 'no simulated realtime peer attached' } }, { status: 500 });
      const answer = await state.onRealtimeCall({ sdp, session });
      return new Response(answer.sdp, { status: 201, headers: { 'content-type': 'application/sdp', location: `/v1/realtime/calls/${answer.callId}` } });
    }
    const hang = /^\/v1\/realtime\/calls\/([^/]+)\/hangup$/.exec(url.pathname);
    if (hang && req.method === 'POST') {
      state.hangups.push({ callId: hang[1], at: Date.now() });
      await state.onHangup?.(hang[1]);
      return new Response(null, { status: 200 });
    }
    return Response.json({ error: { code: 'not_found' } }, { status: 404 });
  }

  const server = createServer(async (nreq, nres) => {
    const chunks = [];
    for await (const c of nreq) chunks.push(c);
    const headers = new Headers();
    for (const [k, v] of Object.entries(nreq.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    const req = new Request(`http://${nreq.headers.host}${nreq.url}`, { method: nreq.method, headers, body: ['GET', 'HEAD'].includes(nreq.method) ? undefined : Buffer.concat(chunks) });
    let res;
    try { res = await handle(req); } catch (e) { res = Response.json({ error: { code: 'mock_crash', message: String(e) } }, { status: 500 }); }
    const h = {}; res.headers.forEach((v, k) => { h[k] = v; });
    nres.writeHead(res.status, h);
    nres.end(Buffer.from(await res.arrayBuffer()));
  });

  return {
    state,
    async listen(port = 0) {
      // Reject on EADDRINUSE etc. instead of leaving an unhandled 'error' event (fixed CK_MOCK_PORT in BASE_URL mode).
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => { server.off('error', reject); resolve(); }); });
      this.origin = `http://127.0.0.1:${server.address().port}`;
      return this.origin;
    },
    close() { return new Promise((r) => { server.closeAllConnections?.(); server.close(r); }); },
  };
}
