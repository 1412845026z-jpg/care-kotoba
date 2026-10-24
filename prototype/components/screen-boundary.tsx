'use client';
// Error boundary for one screen (a tab, or the practice overlay). A rendering error used to blank
// the whole app (docs/08 #16; ENV-002 showed a notes-page crash taking over the page). Now only the
// broken screen is replaced by a message; navigation, saved notes and history keep working.
import { Component, type ReactNode } from 'react';
import { Support } from './ui';
import { SAY } from '@/lib/i18n';

type Props = { children: ReactNode; label: string; resetKey?: unknown; onHome?: () => void; homeLabel?: string; overlay?: boolean; locale?: string };
type State = { error: Error | null };

/** Test hook: an e2e test sets window.__CK_CRASH_TEST__ to a screen label to check this boundary. */
function CrashProbe({ label }: { label: string }) {
  if (typeof window !== 'undefined' && (window as unknown as { __CK_CRASH_TEST__?: string }).__CK_CRASH_TEST__ === label) throw new Error(`crash test: ${label}`);
  return null;
}

export class ScreenBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[screen-error]', this.props.label, error?.message);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return <><CrashProbe label={this.props.label} />{this.props.children}</>;
    const { onHome, homeLabel, overlay } = this.props;
    return (
      <section className={'screen-error' + (overlay ? ' overlay' : '')} role="alert" data-screen={this.props.label}>
        <h2>この画面を表示できませんでした</h2>
        <p>ノートや学習記録は消えていません。</p>
        {this.props.locale && this.props.locale !== 'ja' ? <p><Support locale={this.props.locale} t={SAY.screenError} /></p> : null}
        <div className="screen-error-actions">
          <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>もう一度表示する</button>
          {onHome && <button className="btn btn-white" onClick={() => { this.setState({ error: null }); onHome(); }}>{homeLabel || 'ホームに戻る'}</button>}
        </div>
      </section>
    );
  }
}
