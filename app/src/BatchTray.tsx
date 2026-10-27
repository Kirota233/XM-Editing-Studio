import { DEFAULT_WATERMARK_STATE, WatermarkState } from './WatermarkStudio.tsx';

declare const i: any;

export interface BatchTrayProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  automation?: any;
}

export function BatchTray({ activeTab, onNavigate, automation }: BatchTrayProps) {
  const [expanded, setExpanded] = i.useState(false);
  const [ringOpen, setRingOpen] = i.useState(true);
  const [wmState, setWmState] = i.useState<WatermarkState>(DEFAULT_WATERMARK_STATE);
  const [jyState, setJyState] = i.useState<any>({
    ready: false,
    busy: false,
    exporting: false,
    status: '就绪',
    queue: [],
  });
  const [periodEnabled, setPeriodEnabled] = i.useState(false);
  const [webTask, setWebTask] = i.useState<any>(null);

  const api = (globalThis as any).window?.blackObsidian || (globalThis as any).blackObsidian;

  i.useEffect(() => {
    let alive = true;

    api?.getWatermarkState?.().then((s: WatermarkState) => {
      if (alive && s) setWmState(s);
    }).catch(() => {});

    api?.getPeriodKeeperStatus?.().then((s: any) => {
      if (alive && s) setPeriodEnabled(Boolean(s.enabled));
    }).catch(() => {});

    api?.getWebAnalysisTask?.().then((t: any) => {
      if (alive && t) setWebTask(t);
    }).catch(() => {});

    const offWm = api?.onWatermarkState?.((s: WatermarkState) => {
      if (alive && s) setWmState(s);
    });
    const offWeb = api?.onWebAnalysisTask?.((t: any) => {
      if (alive) setWebTask(t);
    });
    const offTrayNav = api?.onTrayNavigate?.((target: string) => {
      if (!alive) return;
      if (target === 'period') {
        void togglePeriodKeeper();
      } else if (target) {
        onNavigate(target);
      }
    });

    const onWmSync = (e: any) => {
      if (alive && e?.detail) setWmState(e.detail);
    };
    const onJySync = (e: any) => {
      if (alive && e?.detail) setJyState(e.detail);
    };

    const win = (globalThis as any).window;
    win?.addEventListener?.('bos:watermark-state-sync', onWmSync);
    win?.addEventListener?.('bos:jianying-state-sync', onJySync);

    return () => {
      alive = false;
      if (typeof offWm === 'function') offWm();
      if (typeof offWeb === 'function') offWeb();
      if (typeof offTrayNav === 'function') offTrayNav();
      win?.removeEventListener?.('bos:watermark-state-sync', onWmSync);
      win?.removeEventListener?.('bos:jianying-state-sync', onJySync);
    };
  }, [api, onNavigate]);

  const togglePeriodKeeper = async () => {
    try {
      const next = await api?.setPeriodKeeperEnabled?.(!periodEnabled, 'period');
      if (next) setPeriodEnabled(Boolean(next.enabled));
    } catch {
      /* ignore */
    }
  };

  // Compute aggregate batch metrics across all modules
  const wmRunning = Boolean(wmState.running);
  const jyRunning = Boolean(jyState.busy || jyState.exporting || jyState.recording);
  const scriptJobs = Array.isArray(automation?.jobs) ? automation.jobs : [];
  const scriptRunningCount = scriptJobs.filter((j: any) => j.status === 'running' || j.status === 'generating' || j.status === 'queued').length;
  const webRunning = Boolean(webTask && (webTask.status === 'running' || webTask.status === 'waiting'));

  const activeTaskCount =
    (wmRunning ? 1 : 0) +
    (jyRunning ? 1 : 0) +
    (scriptRunningCount > 0 ? 1 : 0) +
    (webRunning ? 1 : 0);

  const anyRunning = activeTaskCount > 0;

  // Auto-open radial satellites when a batch task starts
  i.useEffect(() => {
    if (anyRunning) {
      setRingOpen(true);
    }
  }, [anyRunning]);

  const ringProgress = wmRunning
    ? wmState.overallProgress
    : jyRunning
    ? 65
    : scriptRunningCount > 0
    ? 50
    : wmState.totalCount > 0
    ? wmState.overallProgress
    : 0;

  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.max(0, Math.min(100, ringProgress)) / 100) * circumference;

  const quickAddWatermarkVideos = async (e: any) => {
    e.stopPropagation();
    try {
      const next = await api?.chooseWatermarkVideos?.();
      if (next) {
        setWmState(next);
        window.dispatchEvent(new CustomEvent('bos:watermark-state-sync', { detail: next }));
      }
      onNavigate('watermark');
    } catch {
      onNavigate('watermark');
    }
  };

  const quickScanJianying = async (e: any) => {
    e.stopPropagation();
    onNavigate('jianying');
    try {
      const res = await api?.jianyingAction?.('scan', {});
      if (res) {
        setJyState(res);
        window.dispatchEvent(new CustomEvent('bos:jianying-state-sync', { detail: res }));
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <aside
      className={`bos-batch-tray ${anyRunning ? 'is-running' : ''} ${ringOpen ? 'ring-open' : ''} ${expanded ? 'drawer-open' : ''}`}
      aria-label="右下角全局批量任务星环托盘"
    >
      {/* Expandable Multi-Module Batch Task Drawer */}
      {expanded && (
        <div className="bos-tray-drawer" role="dialog" aria-label="全局批量任务与扩展中枢">
          <header className="bos-tray-drawer-head">
            <div>
              <span className="bos-tray-eyebrow">GLOBAL BATCH & EXTENSION HUB</span>
              <h4>全局批量任务与快捷扩展托盘</h4>
            </div>
            <button
              type="button"
              className="bos-tray-close"
              onClick={() => setExpanded(false)}
              title="收起任务抽屉"
            >
              ✕
            </button>
          </header>

          <div className="bos-tray-module-list">
            {/* Module 1: Native Hardware Watermark */}
            <div className={`bos-tray-module ${wmRunning ? 'is-active' : ''}`}>
              <div className="bos-tray-mod-top">
                <div className="bos-tray-mod-title">
                  <span className="bos-tray-dot" data-state={wmRunning ? 'run' : wmState.totalCount > 0 ? 'ready' : 'idle'} />
                  <strong>样片批量水印 (C# 硬件加速)</strong>
                </div>
                <span className="bos-tray-mod-meta">
                  {wmState.totalCount > 0
                    ? `${wmState.completedCount}/${wmState.totalCount} (${wmState.overallProgress}%)`
                    : '空闲'}
                </span>
              </div>
              {wmState.totalCount > 0 && (
                <div className="bos-tray-bar">
                  <div className="bos-tray-bar-fill" style={{ width: `${wmState.overallProgress}%` }} />
                </div>
              )}
              <div className="bos-tray-mod-actions">
                <button type="button" onClick={quickAddWatermarkVideos}>+ 加视频</button>
                {wmRunning ? (
                  <button type="button" className="is-warn" onClick={() => api?.cancelWatermarkBatch?.()}>
                    停止合成
                  </button>
                ) : wmState.totalCount > wmState.completedCount ? (
                  <button type="button" className="is-accent" onClick={() => api?.startWatermarkBatch?.()}>
                    启动合成
                  </button>
                ) : null}
                <button type="button" onClick={() => { onNavigate('watermark'); setExpanded(false); }}>
                  打开面板 →
                </button>
              </div>
            </div>

            {/* Module 2: Jianying Batch Automation */}
            <div className={`bos-tray-module ${jyRunning ? 'is-active' : ''}`}>
              <div className="bos-tray-mod-top">
                <div className="bos-tray-mod-title">
                  <span className="bos-tray-dot" data-state={jyRunning ? 'run' : 'ready'} />
                  <strong>剪映自动化 (批量导出/字幕)</strong>
                </div>
                <span className="bos-tray-mod-meta">
                  {jyRunning ? jyState.status || '执行中' : `草稿 ${jyState.queue?.length || 0} 项`}
                </span>
              </div>
              <div className="bos-tray-mod-actions">
                <button type="button" onClick={quickScanJianying}>扫描草稿</button>
                {jyRunning && (
                  <button type="button" className="is-warn" onClick={() => api?.jianyingAction?.('stop', {})}>
                    紧急停止
                  </button>
                )}
                <button type="button" onClick={() => { onNavigate('jianying'); setExpanded(false); }}>
                  打开面板 →
                </button>
              </div>
            </div>

            {/* Module 3: Script & Suno Batch Queue */}
            <div className={`bos-tray-module ${scriptRunningCount > 0 ? 'is-active' : ''}`}>
              <div className="bos-tray-mod-top">
                <div className="bos-tray-mod-title">
                  <span className="bos-tray-dot" data-state={scriptRunningCount > 0 ? 'run' : scriptJobs.length > 0 ? 'ready' : 'idle'} />
                  <strong>剧本拆解与智能配乐队列</strong>
                </div>
                <span className="bos-tray-mod-meta">
                  {scriptRunningCount > 0 ? `生成中 ${scriptRunningCount} 项` : `队列 ${scriptJobs.length} 项`}
                </span>
              </div>
              <div className="bos-tray-mod-actions">
                <button type="button" onClick={() => { onNavigate('workspace'); setExpanded(false); }}>
                  剧本工作台 →
                </button>
                <button type="button" onClick={() => { onNavigate('music'); setExpanded(false); }}>
                  编曲室 →
                </button>
              </div>
            </div>

            {/* Module 4: Clipboard Guard & Domestic AI */}
            <div className="bos-tray-module">
              <div className="bos-tray-mod-top">
                <div className="bos-tray-mod-title">
                  <span className="bos-tray-dot" data-state={periodEnabled ? 'ready' : 'idle'} />
                  <strong>剪贴板句号守护 & 国内 AI</strong>
                </div>
                <span className="bos-tray-mod-meta">
                  {periodEnabled ? '守护已开启' : '守护已关闭'}
                </span>
              </div>
              <div className="bos-tray-mod-actions">
                <button
                  type="button"
                  className={periodEnabled ? 'is-accent' : ''}
                  onClick={togglePeriodKeeper}
                >
                  {periodEnabled ? '关闭句号守护' : '开启句号守护'}
                </button>
                <button type="button" onClick={() => { onNavigate('webai'); setExpanded(false); }}>
                  国内 AI 协同 →
                </button>
              </div>
            </div>
          </div>

          {/* Extensible Quick-Action Bar */}
          <footer className="bos-tray-ext-bar">
            <button type="button" onClick={() => api?.quickLaunch?.('launch')}>
              🚀 启动剪映
            </button>
            <button type="button" onClick={() => api?.updaterAction?.('check')}>
              🔄 检查更新
            </button>
            <button type="button" onClick={() => { onNavigate('providers'); setExpanded(false); }}>
              ⚙️ 接口与指南
            </button>
          </footer>
        </div>
      )}

      {/* Radial Hub Container: Core Orb + 5 Surrounding Satellite Action Nodes */}
      <div className="bos-tray-radial-hub">
        {/* Surrounding Satellite 1: Top -> Batch Watermark */}
        <button
          type="button"
          className={`bos-tray-sat sat-1 ${activeTab === 'watermark' ? 'is-current' : ''} ${wmRunning ? 'is-busy' : ''}`}
          onClick={() => onNavigate('watermark')}
          title="批量样片水印 (点击进入 · 右键或抽屉快速加片)"
        >
          <span className="bos-sat-icon">💧</span>
          <span className="bos-sat-label">
            水印{wmState.totalCount > 0 ? ` ${wmState.completedCount}/${wmState.totalCount}` : ''}
          </span>
        </button>

        {/* Surrounding Satellite 2: Top-Left -> Jianying Automation */}
        <button
          type="button"
          className={`bos-tray-sat sat-2 ${activeTab === 'jianying' ? 'is-current' : ''} ${jyRunning ? 'is-busy' : ''}`}
          onClick={() => onNavigate('jianying')}
          title="剪映批量自动化导出与字幕对齐"
        >
          <span className="bos-sat-icon">🎬</span>
          <span className="bos-sat-label">剪映</span>
        </button>

        {/* Surrounding Satellite 3: Left -> Script & Music Batch */}
        <button
          type="button"
          className={`bos-tray-sat sat-3 ${activeTab === 'workspace' ? 'is-current' : ''} ${scriptRunningCount > 0 ? 'is-busy' : ''}`}
          onClick={() => onNavigate('workspace')}
          title="剧本智能拆解与 Suno 配乐队列"
        >
          <span className="bos-sat-icon">🎵</span>
          <span className="bos-sat-label">
            配乐{scriptJobs.length > 0 ? ` ${scriptJobs.length}` : ''}
          </span>
        </button>

        {/* Surrounding Satellite 4: Bottom-Left -> PeriodKeeper Clipboard Guard */}
        <button
          type="button"
          className={`bos-tray-sat sat-4 ${periodEnabled ? 'is-enabled' : ''}`}
          onClick={togglePeriodKeeper}
          title={periodEnabled ? '剪贴板句号守护：运行中（点击关闭）' : '剪贴板句号守护：已关闭（点击开启）'}
        >
          <span className="bos-sat-icon">🛡️</span>
          <span className="bos-sat-label">{periodEnabled ? '守护开' : '句号'}</span>
        </button>

        {/* Surrounding Satellite 5: Top-Right -> Web AI / Quick Launch */}
        <button
          type="button"
          className={`bos-tray-sat sat-5 ${activeTab === 'webai' ? 'is-current' : ''} ${webRunning ? 'is-busy' : ''}`}
          onClick={() => onNavigate('webai')}
          title="国内 AI 免密工作台 (DeepSeek / 豆包)"
        >
          <span className="bos-sat-icon">✨</span>
          <span className="bos-sat-label">AI 台</span>
        </button>

        {/* Central Core Orb */}
        <button
          type="button"
          className="bos-tray-orb"
          onClick={() => setExpanded((v: boolean) => !v)}
          onContextMenu={(e: any) => {
            e.preventDefault();
            setRingOpen((v: boolean) => !v);
          }}
          title="左键打开全局批量任务抽屉 · 右键展开/收起四周快捷环"
        >
          <svg className="bos-tray-ring-svg" width="60" height="60" viewBox="0 0 60 60">
            <circle
              className="bos-tray-ring-bg"
              cx="30"
              cy="30"
              r={radius}
              strokeWidth="3"
              fill="none"
            />
            <circle
              className="bos-tray-ring-fg"
              cx="30"
              cy="30"
              r={radius}
              strokeWidth="3"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="bos-tray-orb-inner">
            {anyRunning ? (
              <>
                <strong className="bos-tray-orb-pct">{ringProgress}%</strong>
                <span className="bos-tray-orb-sub">运行 {activeTaskCount}</span>
              </>
            ) : (
              <>
                <strong className="bos-tray-orb-icon">⚡</strong>
                <span className="bos-tray-orb-sub">任务托盘</span>
              </>
            )}
          </div>
        </button>

        {/* Mini Satellite Ring Toggle Pill */}
        <button
          type="button"
          className="bos-tray-ring-toggle"
          onClick={() => setRingOpen((v: boolean) => !v)}
          title={ringOpen ? '收起四周环绕功能' : '展开四周环绕功能'}
        >
          {ringOpen ? '−' : '+'}
        </button>
      </div>
    </aside>
  );
}
