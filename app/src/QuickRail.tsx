declare const i: any;

interface LayoutSettings {
  sidebarWidth?: number;
  autoHideRail?: boolean;
}

const readLayout = (): LayoutSettings => {
  try {
    return JSON.parse(localStorage.getItem('xm.layout.v1') as string) || {};
  } catch {
    return {};
  }
};

function saveLayout(values: Partial<LayoutSettings>): void {
  try {
    localStorage.setItem('xm.layout.v1', JSON.stringify({ ...readLayout(), ...values }));
  } catch {
    /* current layout remains usable */
  }
}

export function SidebarResizer() {
  const [width, setWidth] = i.useState(() => Math.max(180, Math.min(360, Number(readLayout().sidebarWidth) || 260)));
  const clamp = (value: number) => Math.max(180, Math.min(360, window.innerWidth - 500, value));
  i.useEffect(() => {
    document.documentElement.style.setProperty('--xm-sidebar-width', width + 'px');
  }, [width]);
  const commit = (value: number) => {
    const next = clamp(value);
    setWidth(next);
    saveLayout({ sidebarWidth: next });
  };
  return (
    <div
      className="bos-sidebar-resizer"
      role="separator"
      aria-label="调整左侧导航宽度"
      aria-orientation="vertical"
      aria-valuemin={180}
      aria-valuemax={360}
      aria-valuenow={width}
      tabIndex={0}
      title="拖动调整左栏宽度，双击恢复默认"
      onDoubleClick={() => commit(260)}
      onPointerDown={(event: any) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        document.documentElement.dataset.resizing = 'true';
      }}
      onPointerMove={(event: any) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) setWidth(clamp(event.clientX));
      }}
      onPointerUp={(event: any) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        delete document.documentElement.dataset.resizing;
        saveLayout({ sidebarWidth: width });
      }}
      onLostPointerCapture={() => {
        delete document.documentElement.dataset.resizing;
      }}
      onKeyDown={(event: any) => {
        if (['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) {
          event.preventDefault();
          commit(event.key === 'Home' ? 260 : width + (event.key === 'ArrowRight' ? 10 : -10));
        }
      }}
    />
  );
}

interface QuickRailState {
  folders: Array<{ id: string; name: string; path: string }>;
  installs: Array<{ version: string; path: string }>;
  selected: string;
}

export function QuickRail() {
  const [state, setState] = i.useState<QuickRailState>({ folders: [], installs: [], selected: '' });
  const [autoHide, setAutoHide] = i.useState(() => !!readLayout().autoHideRail);
  const [compact, setCompact] = i.useState(() => !!(globalThis as any).matchMedia?.('(max-width: 1050px)').matches);
  const [revealed, setRevealed] = i.useState(false);
  const restoreButton = i.useRef<HTMLButtonElement | null>(null);
  const rail = i.useRef<HTMLElement | null>(null);
  const [scanning, setScanning] = i.useState(true);
  const [pending, setPending] = i.useState(false);
  const busy = i.useRef(false);
  const [error, setError] = i.useState('');
  const api = (globalThis as any).blackObsidian;
  const overlay = autoHide || compact;
  const expanded = !overlay || revealed;

  const act = async (action: string, value?: string) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      if (!api?.quickLaunch) throw new Error('请使用更新后的桌面程序。');
      const next = await api.quickLaunch(action, value);
      if (next) setState(next);
    } catch (err: any) {
      setError(err.message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  const scan = async (force = false) => {
    setScanning(true);
    await act('scan', force ? 'force' : undefined);
    setScanning(false);
  };

  i.useEffect(() => {
    void scan();
  }, []);

  i.useEffect(() => {
    const query = (globalThis as any).matchMedia?.('(max-width: 1050px)');
    if (!query) return;
    const update = () => {
      setCompact(query.matches);
      setRevealed(false);
    };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  i.useEffect(() => {
    document.documentElement.dataset.railAuto = String(autoHide);
    saveLayout({ autoHideRail: autoHide });
  }, [autoHide]);

  i.useEffect(() => {
    if (!expanded && rail.current?.contains(document.activeElement)) {
      restoreButton.current?.focus({ preventScroll: true });
    }
  }, [expanded]);

  const conceal = () => {
    if (overlay) setRevealed(false);
  };

  return (
    <>
      {overlay && !revealed && (
        <button
          ref={restoreButton}
          type="button"
          className="bos-rail-peek"
          aria-label="展开快捷栏"
          aria-controls="bos-quickrail-content"
          aria-expanded={false}
          title="展开剪映与文件夹快捷栏"
          onClick={() => setRevealed(true)}
        >
          ‹
        </button>
      )}
      {autoHide && !revealed && (
        <div
          className="bos-rail-edge"
          aria-hidden="true"
          onPointerEnter={(event: any) => {
            if (event.pointerType === 'mouse') setRevealed(true);
          }}
        />
      )}
      <aside
        ref={rail}
        className="bos-quickrail"
        aria-label="剪映与自定义文件夹"
        aria-busy={pending}
        data-expanded={expanded}
        onMouseLeave={conceal}
        onBlur={(event: any) => {
          if (!event.currentTarget.contains(event.relatedTarget)) conceal();
        }}
        onKeyDown={(event: any) => {
          if (event.key === 'Escape' && overlay) {
            event.preventDefault();
            setRevealed(false);
          }
        }}
      >
        <div className="bos-rail-inner" id="bos-quickrail-content" inert={!expanded} aria-hidden={!expanded}>
          <header>
            <span>QUICK ACCESS</span>
            <label title="隐藏侧栏以释放工作区宽度；鼠标移至右边缘可唤出">
              <input
                type="checkbox"
                checked={autoHide}
                onChange={(event: any) => {
                  setAutoHide(event.target.checked);
                  setRevealed(false);
                  event.currentTarget.blur();
                }}
              />
              自动隐藏
            </label>
            {overlay && revealed && (
              <button
                type="button"
                className="bos-rail-close"
                aria-label="收起快捷栏"
                title="收起快捷栏"
                onClick={() => setRevealed(false)}
              >
                ›
              </button>
            )}
          </header>

          <section className="bos-launch-card">
            <span className="bos-launch-icon">剪</span>
            <h2>剪映快捷启动</h2>
            <p>
              {scanning
                ? '正在扫描剪映…'
                : state.installs.length
                  ? '已就绪 · ' + state.installs.length + ' 个版本'
                  : '未检测到剪映'}
            </p>
            {!!state.installs.length && (
              <select
                aria-label="剪映启动项"
                disabled={pending}
                value={state.selected}
                onChange={(event: any) => act('select', event.target.value)}
              >
                {state.installs.map(item => (
                  <option key={item.path} value={item.path}>
                    {item.version} · {item.path}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="bos-launch-primary"
              disabled={!state.selected || scanning || pending}
              onClick={() => act('launch')}
            >
              启动剪映 ↗
            </button>
            <div className="bos-rail-tools">
              <button type="button" disabled={scanning || pending} onClick={() => scan(true)}>
                重新检测
              </button>
              <button type="button" disabled={pending} onClick={() => act('browse')}>
                手动定位
              </button>
            </div>
          </section>

          <section className="bos-folder-card">
            <div className="bos-folder-heading">
              <h3>常用目录</h3>
              <span>{state.folders.length} / 8</span>
            </div>
            <p>双击直达素材或草稿目录</p>
            <div className="bos-folder-list">
              {state.folders.map(folder => (
                <div className="bos-folder-item" key={folder.id}>
                  <button
                    type="button"
                    className="bos-folder-open"
                    title={folder.path + '\n双击打开，或按 Enter'}
                    onDoubleClick={() => act('openFolder', folder.id)}
                    onKeyDown={(event: any) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void act('openFolder', folder.id);
                      }
                    }}
                  >
                    <span aria-hidden="true">▱</span>
                    <span>
                      <strong>{folder.name}</strong>
                      <small>{folder.path}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="bos-folder-remove"
                    disabled={pending}
                    aria-label={'移除快捷入口 ' + folder.name}
                    title="移除快捷入口"
                    onClick={() => act('removeFolder', folder.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="bos-folder-add"
              disabled={state.folders.length >= 8 || pending}
              onClick={() => act('addFolder')}
            >
              ＋ 添加目录
            </button>
          </section>

          {error && (
            <p className="bos-rail-error" role="alert">
              {error}
            </p>
          )}
          <footer>XM 剪辑台 · v1.3.1</footer>
        </div>
      </aside>
    </>
  );
}
