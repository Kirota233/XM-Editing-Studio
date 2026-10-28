import { normalizeSubtitlePunctuation } from '../shared/period-text.mjs';
import { periodKeeperStatusText } from '../shared/subtitle-punctuation.mjs';
import { usePanelCollapsed } from './PanelState.jsx';

declare const i: any;

export async function copySubtitleText(text: string) {
  const api = (globalThis as any).blackObsidian;
  if (api?.copySubtitleText) return api.copySubtitleText(text);
  await navigator.clipboard.writeText(normalizeSubtitlePunctuation(text));
  return { punctuationMode: 'standard', clipboardProtected: false };
}

export function PeriodKeeper({ text }: { text: string }) {
  const [state, setState] = i.useState(null as any);
  const [busyAction, setBusyAction] = i.useState('' as '' | 'toggle' | 'copy');
  const [error, setError] = i.useState('');
  const [notice, setNotice] = i.useState('');
  const [collapsed, toggleCollapsed] = usePanelCollapsed('period-keeper');
  const api = (globalThis as any).blackObsidian;
  const available = typeof api?.getPeriodKeeperStatus === 'function';
  const latestText = i.useRef(text);
  latestText.current = text;
  const busy = busyAction !== '';

  i.useEffect(() => {
    if (!available) return;
    let active = true, timer: any;
    const refresh = async () => {
      try {
        const value = await api.getPeriodKeeperStatus();
        if (active) setState(value);
      } catch (err: any) {
        if (active) setError(err.message);
      }
      if (active) timer = setTimeout(refresh, 4000);
    };
    void refresh();
    return () => { active = false; clearTimeout(timer); };
  }, []);

  const perform = async (kind: 'toggle' | 'copy', operation: () => Promise<void>) => {
    setBusyAction(kind); setError(''); setNotice('');
    try { await operation(); }
    catch (err: any) { setError(err.message || '操作失败。'); }
    finally { setBusyAction(''); }
  };

  const copy = async () => {
    if (available && !state?.enabled && typeof api?.setPeriodKeeperEnabled === 'function') {
      const enabledState = await api.setPeriodKeeperEnabled(true, 'compatible');
      setState(enabledState);
    }
    const result = await copySubtitleText(latestText.current);
    setNotice(result.clipboardProtected ? `已复制 ${result.copiedLines} 行（已启用标点保护）` : '已复制标准字幕文本');
  };

  return (
    <section className="bos-period-keeper" aria-labelledby="bos-period-title">
      <div className="bos-period-bar">
        <div className="bos-period-meta">
          <span className={`bos-status-dot${state?.enabled ? ' is-online' : ''}`} />
          <h4 id="bos-period-title">剪映标点保护</h4>
          <span className="bos-period-pill" role="status">
            {state ? periodKeeperStatusText(state) : available ? '检测剪映中…' : '桌面端可用'}
          </span>
          <small className="bos-period-sub">按原工具方式保护 , . 与 ...</small>
        </div>
        <div className="bos-period-actions">
          <button
            type="button"
            role="switch"
            className={busyAction === 'toggle' ? 'is-loading' : ''}
            aria-label="剪映标点保留"
            aria-checked={!!state?.enabled}
            disabled={!available || !state || busy}
            onClick={() => perform('toggle', async () => { setState(await api.setPeriodKeeperEnabled(!state.enabled, 'compatible')); })}
          >
            {busyAction === 'toggle' && <span className="bos-btn-spinner" aria-hidden="true" />}
            {busyAction === 'toggle' ? (state?.enabled ? '关闭中…' : '启动中…') : (state?.enabled ? '关闭保留' : '开启保留')}
          </button>
          <button
            type="button"
            className={`bos-script-primary${busyAction === 'copy' ? ' is-loading' : ''}`}
            disabled={!text.trim() || busy}
            onClick={() => perform('copy', copy)}
          >
            {busyAction === 'copy' && <span className="bos-btn-spinner" aria-hidden="true" />}
            {busyAction === 'copy' ? '复制中…' : '复制到剪映'}
          </button>
          <button
            type="button"
            className="bos-panel-toggle bos-icon-toggle"
            aria-expanded={!collapsed}
            aria-controls="bos-period-body"
            title={collapsed ? '展开详情' : '收起详情'}
            onClick={toggleCollapsed}
          >
            {collapsed ? '⌄' : '⌃'}
          </button>
        </div>
      </div>
      <div id="bos-period-body" hidden={collapsed}>
        {(error || state?.error || state?.clipboardError) && (
          <p className="bos-script-warning" role="alert">{error || state.error || state.clipboardError}</p>
        )}
        {notice && <p className="bos-script-message" role="status">{notice}</p>}
      </div>
    </section>
  );
}
