declare const i: any;

export interface UpdaterState {
  status: 'idle' | 'checking' | 'available' | 'up-to-date' | 'downloading' | 'ready' | 'error';
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  progress: number;
  releaseUrl?: string;
  error?: string;
}

const DEFAULT_STATE: UpdaterState = {
  status: 'idle',
  currentVersion: '1.4.0',
  latestVersion: '1.4.0',
  hasUpdate: false,
  progress: 0,
};

export function TitleBar({ onNavigate }: { onNavigate?: (tab: string) => void } = {}) {
  const [state, setState] = i.useState(DEFAULT_STATE as UpdaterState);
  const api = (globalThis as any).blackObsidian;

  i.useEffect(() => {
    let alive = true;
    api?.getUpdaterStatus?.().then((s: UpdaterState) => {
      if (alive && s) setState(s);
    }).catch(() => {});
    const off = api?.onUpdaterState?.((s: UpdaterState) => {
      if (alive && s) setState(s);
    });
    const offNav = api?.onTrayNavigate?.((target: string) => {
      if (!alive || !target) return;
      if (target === 'script') {
        onNavigate?.('workspace');
      } else {
        onNavigate?.(target);
      }
    });
    return () => {
      alive = false;
      if (typeof off === 'function') off();
      if (typeof offNav === 'function') offNav();
    };
  }, [onNavigate]);

  const handleAction = () => {
    if (!api?.updaterAction) return;
    if (state.status === 'available') {
      void api.updaterAction('download').catch(() => {});
    } else if (state.status === 'ready') {
      void api.updaterAction('install').catch(() => {});
    } else if (state.status !== 'checking' && state.status !== 'downloading') {
      void api.updaterAction('check').catch(() => {});
    }
  };

  let label = `v${state.currentVersion} · 检查更新`;
  let badgeClass = 'bos-update-pill';
  if (state.status === 'checking') {
    label = '正在检查更新…';
  } else if (state.status === 'up-to-date') {
    label = `v${state.currentVersion} · 已是最新`;
  } else if (state.status === 'available') {
    label = `发现新版本 v${state.latestVersion} · 一键更新`;
    badgeClass = 'bos-update-pill is-available';
  } else if (state.status === 'downloading') {
    label = `正在下载 v${state.latestVersion} (${state.progress}%)…`;
    badgeClass = 'bos-update-pill is-downloading';
  } else if (state.status === 'ready') {
    label = `v${state.latestVersion} 已就绪 · 立即重启安装`;
    badgeClass = 'bos-update-pill is-ready';
  } else if (state.status === 'error') {
    label = '检查更新失败 · 点击重试';
    badgeClass = 'bos-update-pill is-error';
  }

  return (
    <header className="bos-titlebar" aria-label="窗口标题栏">
      <div className="bos-titlebar-drag">
        <span className="bos-titlebar-dot" aria-hidden="true" />
        <span className="bos-titlebar-brand">XM剪辑台</span>
        <span className="bos-titlebar-version">v{state.currentVersion}</span>
      </div>
      <div className="bos-titlebar-actions">
        <button
          type="button"
          className="bos-companion-pill"
          onClick={() => api?.companionAction?.('toggle').catch(() => {})}
          title="呼出或隐藏桌面可爱的剪映伴侣毛玻璃悬浮球（支持自动吸附剪映窗口）"
        >
          🐾 剪映伴侣悬浮窗
        </button>
        <button
          type="button"
          className={badgeClass}
          disabled={state.status === 'checking' || state.status === 'downloading'}
          onClick={handleAction}
          title={state.error || label}
        >
          {label}
        </button>
      </div>
    </header>
  );
}
