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
