// Decides when the client may send `response.create` on a Realtime session, so a learner's typed
// line always gets exactly one reply and no create is rejected with
// `conversation_already_has_active_response`.
//
// Pure logic (no DOM, no WebRTC) so it can be unit-tested with scripted server events.
// The idea of sequencing creates comes from openai-agents-js (MIT) ResponseCreateSequencer;
// this implementation is independent.
//
// Rules
// - A create is "in flight" from the moment it is sent until the server answers it with
//   `response.created` or rejects it. While one is in flight, or any response is active, or the
//   learner is speaking (server VAD will create its own response), new requests are queued.
// - A typed item is "covered" once a response was created after the server added that item:
//   `conversation.item.added` (GA; `conversation.item.created` in the beta) arrives before the
//   `response.created` that sees it, because the server emits events in processing order. Covered
//   items need no extra create, whoever created the response (our create or server VAD).
// - Servers or mocks that never echo the item: when our own create is acknowledged, the items it was
//   sent for are "probably covered"; that is confirmed when the response finishes, and undone if the
//   item shows up afterwards or the create turns out to be rejected.
// - A rejection (`conversation_already_has_active_response`) is matched to our create by
//   `error.event_id` (or, without it, to the create still in flight). Its items become uncovered
//   again and are retried when the active response is done. Immediate retries while nothing is
//   known to be active are capped, so a server in an unexpected state cannot cause a loop.
// - A request without an item (the opening line) is only sent when nothing is running; if
//   something is already responding, the opening is not needed and is dropped.

export type SequencerEvent = {
  type?: string;
  item?: { id?: string };
  error?: { code?: string; type?: string; event_id?: string };
};

type Tracked = { added: boolean; requestedBy: string | null; probablyCovered: boolean };

export type SequencerState = {
  inFlight: string | null;
  active: number;
  speaking: boolean;
  waiting: string[];
  sent: number;
  rejected: number;
};

const MAX_IMMEDIATE_RETRIES = 3;

export class ResponseSequencer {
  private items = new Map<string, Tracked>();
  private inFlight: string | null = null;
  private lastSent: string | null = null;
  private active = 0;
  private speaking = false;
  private retryStreak = 0;
  private seq = 0;
  private sentCount = 0;
  private rejectedCount = 0;

  /** sendCreate must send `{ type: 'response.create', event_id }` and return false if it could not. */
  constructor(private sendCreate: (eventId: string) => boolean, private idPrefix = 'ck_rc') {}

  /** Ask for a reply. With an item id (a typed line) the request is kept until a response covers it. */
  request(itemId?: string): 'sent' | 'queued' | 'dropped' {
    if (itemId) {
      if (!this.items.has(itemId)) this.items.set(itemId, { added: false, requestedBy: null, probablyCovered: false });
      return this.flush() ? 'sent' : 'queued';
    }
    if (this.busy()) return 'dropped';
    return this.sendNow() ? 'sent' : 'dropped';
  }

  /** Feed every server event. Returns true if it caused a create to be sent. */
  observe(e: SequencerEvent): boolean {
    switch (e.type) {
      case 'conversation.item.added':
      case 'conversation.item.created': {
        const t = e.item?.id ? this.items.get(e.item.id) : undefined;
        // Added after the response we thought covered it: that response did not see it.
        if (t) { t.added = true; t.probablyCovered = false; }
        return false;
      }
      case 'input_audio_buffer.speech_started':
        this.speaking = true;
        return false;
      case 'input_audio_buffer.speech_stopped':
        // Server VAD now commits and creates a response itself; do not race it.
        this.speaking = false;
        return false;
      case 'response.created': {
        this.active++;
        this.retryStreak = 0;
        for (const [id, t] of this.items) if (t.added) this.items.delete(id);
        if (this.inFlight) {
          for (const t of this.items.values()) if (t.requestedBy === this.inFlight) t.probablyCovered = true;
          this.inFlight = null;
        }
        return false;
      }
      case 'response.done': {
        this.active = Math.max(0, this.active - 1);
        for (const [id, t] of this.items) if (t.probablyCovered) this.items.delete(id);
        return this.flush();
      }
      case 'error':
        return this.onError(e.error || {});
      default:
        return false;
    }
  }

  get state(): SequencerState {
    return { inFlight: this.inFlight, active: this.active, speaking: this.speaking, waiting: [...this.items.keys()], sent: this.sentCount, rejected: this.rejectedCount };
  }

  private onError(err: NonNullable<SequencerEvent['error']>): boolean {
    const code = String(err.code || err.type || '');
    if (code === 'input_audio_buffer_commit_empty') { this.speaking = false; return this.flush(); }
    const ours = err.event_id ? err.event_id === this.inFlight || err.event_id === this.lastSent : this.inFlight !== null;
    if (!ours) return false;
    const rejectedId = err.event_id || this.inFlight;
    if (rejectedId === this.inFlight) this.inFlight = null;
    if (code !== 'conversation_already_has_active_response') return false; // other failures: no automatic retry
    this.rejectedCount++;
    for (const t of this.items.values()) if (t.requestedBy === rejectedId) { t.requestedBy = null; t.probablyCovered = false; }
    if (this.active > 0) return false; // retried on that response's done
    if (this.retryStreak >= MAX_IMMEDIATE_RETRIES) return false;
    this.retryStreak++;
    return this.flush();
  }

  private busy() { return this.inFlight !== null || this.active > 0 || this.speaking; }

  private flush(): boolean {
    if (this.busy()) return false;
    let needed = false;
    for (const t of this.items.values()) if (!t.probablyCovered) needed = true;
    return needed ? this.sendNow() : false;
  }

  private sendNow(): boolean {
    const id = `${this.idPrefix}_${++this.seq}`;
    if (!this.sendCreate(id)) return false;
    this.inFlight = id;
    this.lastSent = id;
    this.sentCount++;
    for (const t of this.items.values()) if (!t.probablyCovered) t.requestedBy = id;
    return true;
  }
}
