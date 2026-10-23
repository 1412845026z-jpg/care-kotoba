// Ordered transcript for an OpenAI Realtime (GA) session, built from server events.
//
// Why: the learner's input transcription is produced asynchronously and often
// arrives after the reply it triggered has started streaming. Appending turns in
// arrival order shows the reply before the learner's words and leaves stray
// bubbles. Here every turn is keyed by the server item id and positioned by
// `previous_item_id` (sent with input_audio_buffer.committed and
// conversation.item.added), so order follows the conversation, not arrival.
// Pure and immutable; unit-tested in tests/unit/realtime-transcript.test.mjs.

import { confidenceOf, type AsrConfidence } from './asr-confidence';

export type TurnStatus = 'pending' | 'streaming' | 'done' | 'interrupted' | 'failed' | 'empty';
export type Turn = { id: string; role: 'user' | 'assistant'; text: string; status: TurnStatus; source: 'voice' | 'text' | 'seed'; edited?: boolean; responseId?: string; asr?: AsrConfidence };
export type TranscriptState = { order: string[]; turns: Record<string, Turn>; seedCount: number };
// Realtime server events are external JSON; only the fields used below are read.
export type RealtimeEvent = { type?: string; [key: string]: any };

export function initialTranscript(seed: { role: 'user' | 'assistant'; text: string; source?: 'voice' | 'text' }[] = []): TranscriptState {
  const turns: Record<string, Turn> = {};
  const order: string[] = [];
  seed.filter((m) => m.text?.trim()).forEach((m, i) => {
    const id = `seed_${i}`;
    order.push(id);
    turns[id] = { id, role: m.role, text: m.text, status: 'done', source: m.source || 'seed' };
  });
  return { order, turns, seedCount: order.length };
}

function place(state: TranscriptState, id: string, previousId: string | null | undefined): string[] {
  const order = state.order.filter((x) => x !== id);
  const had = order.length !== state.order.length;
  let index: number;
  if (previousId === null) index = state.seedCount; // first server item of this session goes right after any resumed transcript
  else if (previousId && order.includes(previousId)) index = order.indexOf(previousId) + 1;
  else if (had) return state.order; // no better information: keep the current position
  else index = order.length;
  order.splice(Math.min(index, order.length), 0, id);
  return order;
}

function upsert(state: TranscriptState, id: string, patch: Partial<Turn> & { role?: Turn['role'] }, previousId?: string | null): TranscriptState {
  const existing = state.turns[id];
  const turn: Turn = existing ? { ...existing, ...patch } : { id, role: patch.role || 'assistant', text: '', status: 'pending', source: 'voice', ...patch };
  const order = previousId !== undefined || !existing ? place(state, id, previousId) : state.order;
  return { ...state, order, turns: { ...state.turns, [id]: turn } };
}

const finalStatus = (t?: Turn) => !!t && (t.status === 'done' || t.status === 'interrupted' || t.status === 'failed' || t.status === 'empty');

export function applyEvent(state: TranscriptState, e: RealtimeEvent): TranscriptState {
  switch (e?.type) {
    case 'input_audio_buffer.committed':
      if (!e.item_id) return state;
      return upsert(state, e.item_id, state.turns[e.item_id] ? {} : { role: 'user', status: 'pending', source: 'voice' }, e.previous_item_id ?? undefined);
    case 'conversation.item.added':
    case 'conversation.item.created': {
      const item = e.item;
      if (!item?.id || item.type !== 'message' || (item.role !== 'user' && item.role !== 'assistant')) return state;
      const textPart = Array.isArray(item.content) ? item.content.find((c: { type?: string; text?: string }) => c?.type === 'input_text' || c?.type === 'output_text' || c?.type === 'text') : null;
      const existing = state.turns[item.id];
      const patch: Partial<Turn> = existing ? {} : { role: item.role, status: item.role === 'assistant' ? 'streaming' : textPart ? 'done' : 'pending', source: textPart ? 'text' : 'voice', text: textPart?.text || '' };
      return upsert(state, item.id, patch, e.previous_item_id ?? undefined);
    }
    case 'conversation.item.input_audio_transcription.delta': {
      const t = state.turns[e.item_id];
      if (finalStatus(t) || t?.edited) return state;
      return upsert(state, e.item_id, { role: 'user', text: (t?.text || '') + (e.delta || ''), status: 'pending' });
    }
    case 'conversation.item.input_audio_transcription.completed': {
      const t = state.turns[e.item_id];
      if (t?.edited) return upsert(state, e.item_id, { status: 'done' });
      const text = String(e.transcript || '').trim();
      const asr = confidenceOf(e.logprobs);
      return upsert(state, e.item_id, { role: 'user', text, status: text ? 'done' : 'empty', ...(asr ? { asr } : {}) });
    }
    case 'conversation.item.input_audio_transcription.failed':
      if (state.turns[e.item_id]?.edited) return state;
      return upsert(state, e.item_id, { role: 'user', status: 'failed' });
    case 'response.output_item.added':
      if (!e.item?.id || e.item.type !== 'message') return state;
      return upsert(state, e.item.id, state.turns[e.item.id] ? { responseId: e.response_id } : { role: 'assistant', status: 'streaming', responseId: e.response_id });
    case 'response.output_audio_transcript.delta':
    case 'response.audio_transcript.delta':
    case 'response.output_text.delta':
    case 'response.text.delta': {
      if (!e.item_id) return state;
      const t = state.turns[e.item_id];
      if (finalStatus(t)) return state;
      return upsert(state, e.item_id, { role: 'assistant', text: (t?.text || '') + (e.delta || ''), status: 'streaming', responseId: e.response_id ?? t?.responseId });
    }
    case 'response.output_audio_transcript.done':
    case 'response.audio_transcript.done':
    case 'response.output_text.done':
    case 'response.text.done': {
      if (!e.item_id) return state;
      const t = state.turns[e.item_id];
      const text = String(e.transcript ?? e.text ?? t?.text ?? '');
      return upsert(state, e.item_id, { role: 'assistant', text, status: t?.status === 'interrupted' ? 'interrupted' : text.trim() ? 'done' : 'empty' });
    }
    case 'conversation.item.truncated':
      if (!state.turns[e.item_id]) return state;
      return upsert(state, e.item_id, { status: 'interrupted' });
    case 'response.done': {
      const r = e.response;
      if (!r) return state;
      let next = state;
      for (const out of Array.isArray(r.output) ? r.output : []) {
        const t = out?.id ? next.turns[out.id] : undefined;
        if (!t) continue;
        if (r.status === 'cancelled' || r.status === 'incomplete') next = upsert(next, t.id, { status: 'interrupted' });
        else if (t.status === 'streaming') next = upsert(next, t.id, { status: t.text.trim() ? 'done' : 'empty' });
      }
      return next;
    }
    default:
      return state;
  }
}

/** A typed line sent during a live voice session; `id` is sent as the item id so the server echo merges into it. */
export function addTextTurn(state: TranscriptState, id: string, text: string): TranscriptState {
  return upsert(state, id, { role: 'user', text, status: 'done', source: 'text' });
}

export function editTurn(state: TranscriptState, id: string, text: string): TranscriptState {
  const t = state.turns[id];
  if (!t || t.role !== 'user' || !text.trim()) return state;
  return upsert(state, id, { text: text.trim(), edited: true, status: t.status === 'pending' ? 'pending' : 'done' });
}

export function turnsInOrder(state: TranscriptState): Turn[] {
  return state.order.map((id) => state.turns[id]).filter(Boolean);
}

export function pendingUserTurns(state: TranscriptState): number {
  return turnsInOrder(state).filter((t) => t.role === 'user' && t.status === 'pending').length;
}
