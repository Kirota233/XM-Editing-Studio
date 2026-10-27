import { BrowserWindow, screen } from 'electron';

const COMPACT_SIZE = { width: 96, height: 96 };
const EXPANDED_SIZE = { width: 336, height: 448 };

export function createCompanionDock({
  preloadPath,
  iconPath,
  getJianyingState,
  getWatermarkState,
  getPeriodStatus,
  onAction,
}) {
  let win = null;
  let expanded = false;
  let autoDock = true;
  let visible = false;
  let pollTimer = null;
  let manualPosition = null; // { x, y } when user drags manually

  function buildCompanionHtml() {
    const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>XM 剪映伴侣悬浮窗</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
  html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
    font-family: "Segoe UI Variable Display", "Microsoft YaHei UI", system-ui, sans-serif;
    color: #f4f7f5;
  }
  .root {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 8px;
  }

  /* Cute Mascot Orb (Compact Mode) */
  .mascot-wrap {
    position: relative;
    width: 78px;
    height: 78px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    -webkit-app-region: drag;
    animation: floatBob 3.2s ease-in-out infinite;
  }
  .root.is-expanded .mascot-wrap {
    display: none;
  }
  @keyframes floatBob {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
  }
  .mascot-halo {
    position: absolute;
    inset: 2px;
    border-radius: 26px;
    background: radial-gradient(circle at 30% 20%, rgba(197, 245, 79, 0.35), rgba(56, 189, 248, 0.18) 60%, rgba(15, 23, 42, 0.85));
    backdrop-filter: blur(20px) saturate(190%);
    border: 1.5px solid rgba(255, 255, 255, 0.26);
    box-shadow:
      0 12px 28px rgba(0, 0, 0, 0.48),
      inset 0 1px 1px rgba(255, 255, 255, 0.35);
    transition: transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1), border-color 200ms ease;
  }
  .mascot-wrap:hover .mascot-halo {
    transform: scale(1.06);
    border-color: rgba(197, 245, 79, 0.75);
  }
  /* Cute Ears */
  .ear {
    position: absolute;
    top: -3px;
    width: 18px;
    height: 18px;
    border-radius: 6px 14px 4px 12px;
    background: linear-gradient(135deg, rgba(197, 245, 79, 0.85), rgba(56, 189, 248, 0.55));
    border: 1px solid rgba(255, 255, 255, 0.4);
    z-index: 0;
    transition: transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .ear.left { left: 10px; transform: rotate(-18deg); }
  .ear.right { right: 10px; transform: rotate(28deg) scaleX(-1); }
  .mascot-wrap:hover .ear.left { transform: rotate(-28deg) translateY(-2px); }
  .mascot-wrap:hover .ear.right { transform: rotate(38deg) scaleX(-1) translateY(-2px); }

  /* Cute Face */
  .face {
    position: relative;
    z-index: 2;
    width: 52px;
    height: 42px;
    border-radius: 16px;
    background: rgba(11, 15, 19, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.14);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    -webkit-app-region: no-drag;
  }
  .eyes {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .eye {
    width: 7px;
    height: 9px;
    border-radius: 999px;
    background: #c5f54f;
    box-shadow: 0 0 8px rgba(197, 245, 79, 0.8);
    animation: blink 4.2s infinite;
  }
  @keyframes blink {
    0%, 94%, 98%, 100% { transform: scaleY(1); }
    96% { transform: scaleY(0.12); }
  }
  .blush {
    position: absolute;
    top: 22px;
    width: 7px;
    height: 4px;
    border-radius: 999px;
    background: rgba(244, 114, 182, 0.55);
  }
  .blush.left { left: 6px; }
  .blush.right { right: 6px; }
  .mouth {
    width: 10px;
    height: 5px;
    border-bottom: 2px solid #e2e8f0;
    border-radius: 0 0 999px 999px;
  }
  .badge {
    position: absolute;
    bottom: -2px;
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    background: rgba(15, 23, 42, 0.9);
    color: #c5f54f;
    border: 1px solid rgba(197, 245, 79, 0.45);
    z-index: 3;
    -webkit-app-region: no-drag;
  }

  /* Expanded Frosted Glass Panel */
  .glass-panel {
    display: none;
    width: 100%;
    height: 100%;
    border-radius: 22px;
    background: linear-gradient(155deg, rgba(20, 26, 31, 0.84) 0%, rgba(10, 14, 17, 0.92) 100%);
    backdrop-filter: blur(28px) saturate(190%);
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow:
      0 20px 50px rgba(0, 0, 0, 0.65),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
    padding: 14px;
    flex-direction: column;
    gap: 10px;
    animation: panelPop 240ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .root.is-expanded .glass-panel {
    display: flex;
  }
  @keyframes panelPop {
    from { opacity: 0; transform: scale(0.86) translateY(-10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    -webkit-app-region: drag;
  }
  .head-left {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .mini-pet {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(197, 245, 79, 0.28), rgba(56, 189, 248, 0.22));
    border: 1px solid rgba(197, 245, 79, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
  }
  .head-title h4 {
    font-size: 13px;
    font-weight: 700;
    color: #f8fafc;
  }
  .head-title p {
    font-size: 10.5px;
    color: #94a3b8;
  }
  .head-btns {
    display: flex;
    gap: 5px;
    -webkit-app-region: no-drag;
  }
  .icon-btn {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.06);
    color: #cbd5e1;
    cursor: pointer;
    font-size: 12px;
    transition: all 150ms ease;
  }
  .icon-btn:hover {
    border-color: #c5f54f;
    color: #c5f54f;
    transform: translateY(-1px);
  }

  .dock-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 10px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 11.5px;
  }
  .dock-status {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #64748b;
  }
  .dot.on {
    background: #c5f54f;
    box-shadow: 0 0 8px #c5f54f;
  }
  .pill-toggle {
    padding: 3px 9px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.08);
    color: #e2e8f0;
    font-size: 10.5px;
    font-weight: 600;
    cursor: pointer;
  }
  .pill-toggle.active {
    background: rgba(197, 245, 79, 0.22);
    border-color: #c5f54f;
    color: #c5f54f;
  }

  .card {
    padding: 10px 11px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.045);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  }
  .card-top span {
    font-size: 11px;
    color: #94a3b8;
  }
  .progress {
    height: 5px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.4);
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #c5f54f, #38bdf8);
    transition: width 220ms ease;
  }
  .btn-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .act-btn {
    padding: 7px 9px;
    border-radius: 9px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.06);
    color: #f1f5f9;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 160ms ease;
  }
  .act-btn:hover {
    border-color: #c5f54f;
    background: rgba(197, 245, 79, 0.14);
    transform: translateY(-1px);
  }
  .act-btn.primary {
    background: #c5f54f;
    border-color: #c5f54f;
    color: #090b0c;
  }
  .footer-bar {
    margin-top: auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
</style>
</head>
<body>
  <div id="root" class="root">
    <!-- Compact Cute Mascot -->
    <div id="mascot" class="mascot-wrap" title="点击展开毛玻璃伴侣面板 · 按住边缘可拖动">
      <div class="ear left"></div>
      <div class="ear right"></div>
      <div class="mascot-halo"></div>
      <div id="mascot-face" class="face">
        <div class="eyes">
          <div class="eye"></div>
          <div class="eye"></div>
        </div>
        <div class="blush left"></div>
        <div class="blush right"></div>
        <div class="mouth"></div>
      </div>
      <div id="mascot-badge" class="badge">伴侣</div>
    </div>

    <!-- Expanded Frosted Glass Panel -->
    <div class="glass-panel">
      <div class="panel-head">
        <div class="head-left">
          <div class="mini-pet">🐾</div>
          <div class="head-title">
            <h4>XM 灵动伴侣挂件</h4>
            <p id="jy-window-label">支持剪映窗口自动磁吸</p>
          </div>
        </div>
        <div class="head-btns">
          <button id="btn-collapse" class="icon-btn" title="收起为可爱悬浮球">−</button>
          <button id="btn-hide" class="icon-btn" title="隐藏伴侣悬浮窗">✕</button>
        </div>
      </div>

      <div class="dock-bar">
        <div class="dock-status">
          <span id="dock-dot" class="dot on"></span>
          <span id="dock-text">磁吸跟随剪映窗口</span>
        </div>
        <button id="btn-toggle-dock" class="pill-toggle active">磁吸已开</button>
      </div>

      <div class="card">
        <div class="card-top">
          <strong>🎬 剪映自动化伴侣</strong>
          <span id="jy-meta">就绪</span>
        </div>
        <div class="btn-grid">
          <button id="btn-jy-scan" class="act-btn">扫描剪映草稿</button>
          <button id="btn-jy-open" class="act-btn">进入剪映中枢</button>
        </div>
      </div>

      <div class="card">
        <div class="card-top">
          <strong>💧 原生硬件批量水印</strong>
          <span id="wm-meta">空闲</span>
        </div>
        <div class="progress">
          <div id="wm-bar" class="progress-fill"></div>
        </div>
        <div class="btn-grid">
          <button id="btn-wm-add" class="act-btn">+ 快速选视频</button>
          <button id="btn-wm-start" class="act-btn primary">开始合成</button>
        </div>
      </div>

      <div class="card">
        <div class="card-top">
          <strong>🛡️ 剪贴板句号守护</strong>
          <span id="period-meta">已关闭</span>
        </div>
        <div class="btn-grid">
          <button id="btn-period-toggle" class="act-btn">切换句号守护</button>
          <button id="btn-webai-open" class="act-btn">✨ 国内 AI 台</button>
        </div>
      </div>

      <div class="footer-bar">
        <button id="btn-launch-jy" class="act-btn">🚀 启动剪映</button>
        <button id="btn-focus-main" class="act-btn primary">🏠 打开主工作台</button>
      </div>
    </div>
  </div>

  <script>
    const api = window.blackObsidian;
    const rootEl = document.getElementById('root');
    const badgeEl = document.getElementById('mascot-badge');
    const jyWindowLabel = document.getElementById('jy-window-label');
    const dockDot = document.getElementById('dock-dot');
    const dockText = document.getElementById('dock-text');
    const btnToggleDock = document.getElementById('btn-toggle-dock');
    const jyMeta = document.getElementById('jy-meta');
    const wmMeta = document.getElementById('wm-meta');
    const wmBar = document.getElementById('wm-bar');
    const periodMeta = document.getElementById('period-meta');

    function renderState(s) {
      if (!s) return;
      if (s.expanded) {
        rootEl.classList.add('is-expanded');
      } else {
        rootEl.classList.remove('is-expanded');
      }
      const autoDock = Boolean(s.autoDock);
      dockDot.className = 'dot ' + (autoDock ? 'on' : '');
      btnToggleDock.className = 'pill-toggle ' + (autoDock ? 'active' : '');
      btnToggleDock.textContent = autoDock ? '磁吸已开' : '自由悬浮';
      if (s.jianyingFound) {
        jyWindowLabel.textContent = autoDock ? '✓ 已吸附剪映窗口右上角' : '已检测到剪映运行中';
        dockText.textContent = '剪映窗口已连接';
      } else {
        jyWindowLabel.textContent = '未检测到剪映窗口 · 桌面自由悬浮';
        dockText.textContent = autoDock ? '等待剪映启动自动吸附' : '桌面自由拖动模式';
      }

      const wm = s.watermark || {};
      if (wm.running) {
        badgeEl.textContent = wm.overallProgress + '%';
        wmMeta.textContent = wm.completedCount + '/' + wm.totalCount + ' (' + wm.overallProgress + '%)';
        wmBar.style.width = wm.overallProgress + '%';
      } else if (wm.totalCount > 0) {
        badgeEl.textContent = wm.completedCount + '/' + wm.totalCount;
        wmMeta.textContent = '队列 ' + wm.completedCount + '/' + wm.totalCount;
        wmBar.style.width = wm.overallProgress + '%';
      } else {
        badgeEl.textContent = s.periodEnabled ? '守护中' : '伴侣';
        wmMeta.textContent = '空闲';
        wmBar.style.width = '0%';
      }

      jyMeta.textContent = s.jianyingStatus || '就绪';
      periodMeta.textContent = s.periodEnabled ? '✓ 守护已开启' : '已关闭';
    }

    document.getElementById('mascot-face').addEventListener('click', () => {
      api?.companionAction?.('expand', true);
    });
    document.getElementById('mascot-badge').addEventListener('click', () => {
      api?.companionAction?.('expand', true);
    });
    document.getElementById('btn-collapse').addEventListener('click', () => {
      api?.companionAction?.('expand', false);
    });
    document.getElementById('btn-hide').addEventListener('click', () => {
      api?.companionAction?.('hide');
    });
    btnToggleDock.addEventListener('click', () => {
      api?.companionAction?.('toggle-dock');
    });
    document.getElementById('btn-jy-scan').addEventListener('click', () => {
      api?.companionAction?.('jy-scan');
    });
    document.getElementById('btn-jy-open').addEventListener('click', () => {
      api?.companionAction?.('navigate', 'jianying');
    });
    document.getElementById('btn-wm-add').addEventListener('click', () => {
      api?.companionAction?.('wm-add');
    });
    document.getElementById('btn-wm-start').addEventListener('click', () => {
      api?.companionAction?.('wm-start');
    });
    document.getElementById('btn-period-toggle').addEventListener('click', () => {
      api?.companionAction?.('toggle-period');
    });
    document.getElementById('btn-webai-open').addEventListener('click', () => {
      api?.companionAction?.('navigate', 'webai');
    });
    document.getElementById('btn-launch-jy').addEventListener('click', () => {
      api?.companionAction?.('launch-jy');
    });
    document.getElementById('btn-focus-main').addEventListener('click', () => {
      api?.companionAction?.('navigate', '');
    });

    api?.onCompanionState?.(renderState);
    api?.companionAction?.('sync').then(renderState).catch(() => {});
  </script>
</body>
</html>`;
    return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
  }

  function currentSize() {
    return expanded ? EXPANDED_SIZE : COMPACT_SIZE;
  }

  function defaultScreenPosition(size) {
    try {
      const display = screen.getPrimaryDisplay();
      const workArea = display.workArea;
      return {
        x: workArea.x + workArea.width - size.width - 28,
        y: workArea.y + Math.round(workArea.height * 0.22),
      };
    } catch {
      return { x: 1200, y: 180 };
    }
  }

  async function buildStateSnapshot() {
    let jy = null;
    let wm = null;
    let period = null;
    try { jy = await getJianyingState?.(); } catch { /* ignore */ }
    try { wm = await getWatermarkState?.(); } catch { /* ignore */ }
    try { period = await getPeriodStatus?.(); } catch { /* ignore */ }

    const jw = jy?.jianyingWindow || {};
    return {
      visible,
      expanded,
      autoDock,
      jianyingFound: Boolean(jw.found && !jw.minimized),
      jianyingWindow: jw,
      jianyingStatus: jy?.status || '就绪',
      watermark: wm || { running: false, totalCount: 0, completedCount: 0, overallProgress: 0 },
      periodEnabled: Boolean(period?.enabled),
    };
  }

  async function broadcastState() {
    const snap = await buildStateSnapshot();
    if (win && !win.isDestroyed()) {
      win.webContents.send('bos:companion-state', snap);
    }
    return snap;
  }

  async function updateDockPosition() {
    if (!win || win.isDestroyed() || !visible) return;
    const snap = await broadcastState();
    if (!autoDock) return;
    const jw = snap.jianyingWindow;
    if (jw && jw.found && !jw.minimized && jw.width > 200 && jw.height > 200) {
      const size = currentSize();
      const targetX = Math.max(0, jw.x + jw.width - size.width - 18);
      const targetY = Math.max(0, jw.y + 48);
      const [curX, curY] = win.getPosition();
      if (Math.abs(curX - targetX) > 4 || Math.abs(curY - targetY) > 4) {
        win.setBounds({ x: targetX, y: targetY, width: size.width, height: size.height }, false);
      }
    }
  }

  async function ensureWindow() {
    if (win && !win.isDestroyed()) return win;
    const size = currentSize();
    const pos = manualPosition || defaultScreenPosition(size);
    win = new BrowserWindow({
      x: pos.x,
      y: pos.y,
      width: size.width,
      height: size.height,
      frame: false,
      transparent: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      icon: iconPath,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        devTools: false,
        preload: preloadPath,
      },
    });
    win.setAlwaysOnTop(true, 'floating');
    win.on('moved', () => {
      if (!win || win.isDestroyed()) return;
      const [x, y] = win.getPosition();
      manualPosition = { x, y };
    });
    win.on('closed', () => {
      win = null;
      visible = false;
    });
    await win.loadURL(buildCompanionHtml());
    return win;
  }

  function startDockLoop() {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      void updateDockPosition();
    }, 1800);
  }

  function stopDockLoop() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  async function show(expandPanel = false) {
    expanded = Boolean(expandPanel);
    visible = true;
    const w = await ensureWindow();
    const size = currentSize();
    const [curX, curY] = w.getPosition();
    w.setBounds({ x: curX, y: curY, width: size.width, height: size.height }, false);
    w.showInactive();
    startDockLoop();
    return await broadcastState();
  }

  async function hide() {
    visible = false;
    stopDockLoop();
    if (win && !win.isDestroyed()) {
      win.hide();
    }
    return await buildStateSnapshot();
  }

  async function toggle() {
    if (visible && win && !win.isDestroyed() && win.isVisible()) {
      return await hide();
    }
    return await show(false);
  }

  async function setExpanded(nextExpanded) {
    const prevSize = currentSize();
    expanded = Boolean(nextExpanded);
    const nextSize = currentSize();
    if (win && !win.isDestroyed()) {
      const [curX, curY] = win.getPosition();
      // Keep top-right corner anchored when expanding/collapsing
      const nextX = Math.max(8, curX + (prevSize.width - nextSize.width));
      win.setBounds({ x: nextX, y: curY, width: nextSize.width, height: nextSize.height }, false);
    }
    return await broadcastState();
  }

  async function handleAction(action, value) {
    if (action === 'sync') {
      return await broadcastState();
    }
    if (action === 'show') {
      return await show(Boolean(value));
    }
    if (action === 'hide') {
      return await hide();
    }
    if (action === 'toggle') {
      return await toggle();
    }
    if (action === 'expand') {
      return await setExpanded(Boolean(value));
    }
    if (action === 'toggle-dock') {
      autoDock = !autoDock;
      if (autoDock) await updateDockPosition();
      return await broadcastState();
    }
    await onAction?.(action, value);
    return await broadcastState();
  }

  function dispose() {
    stopDockLoop();
    if (win && !win.isDestroyed()) {
      try { win.destroy(); } catch { /* ignore */ }
    }
    win = null;
  }

  return {
    show,
    hide,
    toggle,
    handleAction,
    broadcastState,
    dispose,
  };
}
