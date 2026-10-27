import electron from 'electron';
import os from 'node:os';

const { BrowserWindow, screen } = electron || {};

/**
 * 月薪喵 desktop plugin.
 * - Orb window: transparent, always-on-top cat mascot that can dock to the Jianying window.
 * - Panel window: separate always-on-top frosted-glass (Windows 11 acrylic) control panel that
 *   operates Jianying automation / watermark / punctuation guard in place, like a Jianying plugin.
 */
const ORB_SIZE = { width: 132, height: 148 };
const PANEL_SIZE = { width: 360, height: 584 };

export function supportsAcrylic(release = os.release()) {
  const build = Number(String(release).split('.')[2] || 0);
  return process.platform === 'win32' && build >= 22621;
}

const SHARED_STYLE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: transparent;
    font-family: "Segoe UI Variable Text", "Microsoft YaHei UI", system-ui, sans-serif; color: #f5f7fa; user-select: none; }
  button { font: inherit; cursor: pointer; }
`;

function orbHtml() {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>月薪喵</title><style>${SHARED_STYLE}
  .stage { position: relative; width: 132px; height: 148px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; -webkit-app-region: no-drag; }
  .cat { position: relative; width: 96px; height: 92px; animation: bob 3.4s ease-in-out infinite; }
  @keyframes bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
  .ring { position: absolute; left: 50%; top: 50%; width: 100px; height: 100px; margin: -46px 0 0 -50px; transform: rotate(-90deg); pointer-events: none; }
  .ring circle { fill: none; stroke-width: 4; }
  .ring .bg { stroke: rgba(255,255,255,.14); }
  .ring .fg { stroke: #ffcf6e; stroke-linecap: round; transition: stroke-dashoffset .3s ease; filter: drop-shadow(0 0 4px #ffb347); }
  .ear { position: absolute; top: 2px; width: 30px; height: 30px; border-radius: 6px 22px 4px 22px;
    background: linear-gradient(140deg, #ffe0b0, #ffb562); border: 2px solid #4a2f1d; transition: transform .28s cubic-bezier(.34,1.56,.64,1); }
  .ear::after { content: ""; position: absolute; inset: 6px; border-radius: 4px 14px 2px 14px; background: #ff9fb3; opacity: .85; }
  .ear.l { left: 12px; transform: rotate(-12deg); }
  .ear.r { right: 12px; transform: rotate(102deg); }
  .cat:hover .ear.l { transform: rotate(-24deg) translateY(-2px); }
  .cat:hover .ear.r { transform: rotate(114deg) translateY(-2px); }
  .head { position: absolute; left: 8px; right: 8px; top: 16px; bottom: 2px; border-radius: 44% 44% 40% 40%;
    background: radial-gradient(circle at 35% 28%, #fff4de, #ffd08a 58%, #f5a24a); border: 2px solid #4a2f1d;
    box-shadow: 0 12px 26px rgba(0,0,0,.45), inset 0 -6px 10px rgba(201,112,32,.35); }
  .face { position: absolute; inset: 0; cursor: pointer; border-radius: inherit; }
  .stripe { position: absolute; top: 4px; width: 4px; height: 12px; border-radius: 4px; background: #d9822b; left: 50%; }
  .stripe.a { margin-left: -9px; transform: rotate(-12deg); } .stripe.b { margin-left: -2px; } .stripe.c { margin-left: 5px; transform: rotate(12deg); }
  .eye { position: absolute; top: 30px; width: 9px; height: 12px; border-radius: 50%; background: #2a1a10; animation: blink 4.6s infinite; }
  .eye::after { content: ""; position: absolute; top: 2px; left: 2px; width: 3px; height: 3px; border-radius: 50%; background: #fff; }
  .eye.l { left: 22px; } .eye.r { right: 22px; }
  @keyframes blink { 0%,93%,97%,100% { transform: scaleY(1) } 95% { transform: scaleY(.1) } }
  .nose { position: absolute; top: 44px; left: 50%; margin-left: -4px; width: 8px; height: 6px; border-radius: 50% 50% 60% 60%; background: #ff7d96; }
  .mouth { position: absolute; top: 49px; left: 50%; margin-left: -9px; width: 18px; height: 8px; }
  .mouth::before, .mouth::after { content: ""; position: absolute; top: 0; width: 9px; height: 7px; border: 2px solid #4a2f1d; border-top: 0; border-radius: 0 0 9px 9px; }
  .mouth::before { left: 0; } .mouth::after { right: 0; }
  .blush { position: absolute; top: 46px; width: 11px; height: 6px; border-radius: 50%; background: rgba(255,120,150,.55); }
  .blush.l { left: 11px; } .blush.r { right: 11px; }
  .whisker { position: absolute; top: 46px; width: 16px; height: 2px; border-radius: 2px; background: rgba(74,47,29,.6); }
  .whisker.l1 { left: -6px; transform: rotate(8deg); } .whisker.l2 { left: -6px; top: 52px; transform: rotate(-6deg); }
  .whisker.r1 { right: -6px; transform: rotate(-8deg); } .whisker.r2 { right: -6px; top: 52px; transform: rotate(6deg); }
  .coin { position: absolute; right: -6px; bottom: -4px; width: 30px; height: 30px; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff3b0, #ffc93c 60%, #d99a12); border: 2px solid #7a4d07;
    color: #7a4d07; font-size: 13px; font-weight: 900; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 10px rgba(0,0,0,.4); animation: spin 6s ease-in-out infinite; }
  @keyframes spin { 0%,80%,100% { transform: rotateY(0) } 90% { transform: rotateY(180deg) } }
  .tag { margin-top: 6px; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: .5px;
    background: rgba(20,16,12,.78); color: #ffd58a; border: 1px solid rgba(255,207,110,.5); backdrop-filter: blur(10px);
    cursor: pointer; white-space: nowrap; }
  .stage.busy .tag { color: #1c1206; background: #ffcf6e; }
  </style></head><body>
  <div class="stage" id="stage" title="月薪喵 · 点击展开/收起剪映插件面板，按住可拖动位置">
    <div class="cat">
      <svg class="ring" viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="46"/><circle class="fg" id="ring" cx="50" cy="50" r="46" stroke-dasharray="289" stroke-dashoffset="289"/></svg>
      <div class="ear l"></div><div class="ear r"></div>
      <div class="head">
        <div class="face" id="face">
          <span class="stripe a"></span><span class="stripe b"></span><span class="stripe c"></span>
          <span class="eye l"></span><span class="eye r"></span>
          <span class="blush l"></span><span class="blush r"></span>
          <span class="nose"></span><span class="mouth"></span>
          <span class="whisker l1"></span><span class="whisker l2"></span><span class="whisker r1"></span><span class="whisker r2"></span>
        </div>
      </div>
      <div class="coin">薪</div>
    </div>
    <div class="tag" id="tag">月薪喵</div>
  </div>
  <script>
    const api = window.blackObsidian;
    const ring = document.getElementById('ring'), tag = document.getElementById('tag'), stage = document.getElementById('stage');
    const togglePanel = () => api?.companionAction?.('panel', 'toggle');
    let down = false, dragged = false, startX = 0, startY = 0, lastX = 0, lastY = 0;
    stage.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      down = true; dragged = false;
      startX = lastX = e.screenX;
      startY = lastY = e.screenY;
      try { stage.setPointerCapture(e.pointerId); } catch {}
    });
    stage.addEventListener('pointermove', e => {
      if (!down) return;
      const total = Math.hypot(e.screenX - startX, e.screenY - startY);
      if (total >= 5) dragged = true;
      if (dragged) {
        const dx = e.screenX - lastX, dy = e.screenY - lastY;
        lastX = e.screenX; lastY = e.screenY;
        if (dx || dy) api?.companionAction?.('move-by', { dx, dy });
      }
    });
    stage.addEventListener('pointerup', e => {
      if (!down) return;
      down = false;
      try { stage.releasePointerCapture(e.pointerId); } catch {}
      if (!dragged) togglePanel();
    });
    function render(s) {
      if (!s) return;
      const wm = s.watermark || {}, jy = s.jianying || {};
      const busy = wm.running || jy.busy || jy.exporting;
      const pct = wm.running ? wm.overallProgress : (jy.exporting || jy.busy ? 60 : 0);
      ring.style.strokeDashoffset = String(289 - 289 * Math.max(0, Math.min(100, pct)) / 100);
      stage.className = 'stage' + (busy ? ' busy' : '');
      tag.textContent = wm.running ? '搬砖中 ' + wm.overallProgress + '%' : jy.exporting ? '导出中…' : jy.busy ? '干活中…' : s.panelOpen ? '月薪喵 ▾' : '月薪喵';
    }
    api?.onCompanionState?.(render);
    api?.companionAction?.('sync').then(render).catch(() => {});
  </script></body></html>`;
}

function panelHtml(acrylic) {
  const surface = acrylic ? 'rgba(18, 22, 28, 0.42)' : 'linear-gradient(160deg, rgba(28,32,40,.97), rgba(14,17,22,.98))';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>月薪喵 · 剪映插件</title><style>${SHARED_STYLE}
  body { background: ${surface}; }
  .wrap { height: 100%; display: flex; flex-direction: column; gap: 10px; padding: 12px 12px 10px; animation: pop .26s cubic-bezier(.34,1.56,.64,1); }
  @keyframes pop { from { opacity: 0; transform: translateY(8px) scale(.97) } to { opacity: 1; transform: none } }
  header { display: flex; align-items: center; gap: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,.1); -webkit-app-region: drag; }
  .avatar { width: 34px; height: 34px; border-radius: 12px; background: radial-gradient(circle at 35% 30%, #fff4de, #ffc777 60%, #f09a3e);
    border: 2px solid #4a2f1d; display: flex; align-items: center; justify-content: center; font-size: 17px; }
  header h1 { font-size: 14px; font-weight: 800; } header p { font-size: 10.5px; color: #aab3bf; margin-top: 1px; }
  header .grow { flex: 1; min-width: 0; }
  .icon { -webkit-app-region: no-drag; width: 26px; height: 26px; border-radius: 8px; border: 1px solid rgba(255,255,255,.14);
    background: rgba(255,255,255,.06); color: #d7dde5; font-size: 12px; transition: all .15s; }
  .icon:hover { border-color: #ffcf6e; color: #ffcf6e; }
  .icon.on { background: rgba(255,207,110,.2); border-color: #ffcf6e; color: #ffcf6e; }
  .scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 2px; }
  .scroll::-webkit-scrollbar { width: 4px } .scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18); border-radius: 4px }
  .card { padding: 11px 12px; border-radius: 14px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.08); display: flex; flex-direction: column; gap: 8px; transition: border-color .2s; }
  .card.active { border-color: rgba(255,207,110,.65); }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .title { font-size: 12.5px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
  .meta { font-size: 11px; color: #aab3bf; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: #64748b; flex-shrink: 0; }
  .dot.on { background: #8ee06b; box-shadow: 0 0 6px #8ee06b; } .dot.run { background: #ffcf6e; box-shadow: 0 0 8px #ffcf6e; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .btn { padding: 7px 8px; border-radius: 9px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.07);
    color: #f1f4f8; font-size: 11.5px; font-weight: 650; transition: all .15s; }
  .btn:hover:not(:disabled) { border-color: #ffcf6e; background: rgba(255,207,110,.14); transform: translateY(-1px); }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .btn.primary { background: #ffcf6e; border-color: #ffcf6e; color: #1c1206; }
  .btn.danger { border-color: rgba(248,113,113,.6); color: #fca5a5; }
  .bar { height: 5px; border-radius: 999px; background: rgba(0,0,0,.35); overflow: hidden; }
  .bar > i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #ffcf6e, #ff9d5c); transition: width .25s; }
  .log { font-size: 10.5px; color: #c4cbd4; background: rgba(0,0,0,.22); border-radius: 8px; padding: 6px 8px; line-height: 1.5;
    max-height: 48px; overflow: hidden; white-space: pre-wrap; word-break: break-all; }
  .jobs { display: flex; flex-direction: column; gap: 4px; }
  .job { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #d7dde5; }
  .job span:first-child { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .job b { font-weight: 600; color: #aab3bf; } .job b.done { color: #8ee06b; } .job b.err { color: #fca5a5; } .job b.run { color: #ffcf6e; }
  .modal { border-color: #ffcf6e; background: rgba(255,207,110,.12); }
  .modal p { font-size: 11.5px; line-height: 1.6; white-space: pre-wrap; }
  .switch { position: relative; width: 38px; height: 21px; border-radius: 999px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.1); transition: all .2s; }
  .switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 15px; height: 15px; border-radius: 50%; background: #e5e7eb; transition: transform .22s cubic-bezier(.34,1.56,.64,1); }
  .switch.on { background: #ffcf6e; border-color: #ffcf6e; } .switch.on::after { transform: translateX(17px); background: #1c1206; }
  .toast { position: fixed; left: 12px; right: 12px; bottom: 54px; padding: 8px 10px; border-radius: 10px; font-size: 11.5px;
    background: rgba(20,16,12,.92); border: 1px solid rgba(255,207,110,.5); color: #ffe2a8; opacity: 0; transform: translateY(6px); transition: all .2s; pointer-events: none; }
  .toast.show { opacity: 1; transform: none; }
  footer { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  </style></head><body><div class="wrap">
  <header>
    <div class="avatar">🐱</div>
    <div class="grow"><h1>月薪喵 · 剪映插件</h1><p id="dockLabel">桌面置顶 · 可磁吸剪映窗口</p></div>
    <button class="icon on" id="dockBtn" title="磁吸跟随剪映窗口">🧲</button>
    <button class="icon" id="closeBtn" title="收起面板">✕</button>
  </header>
  <div class="scroll">
    <div class="card modal" id="modalCard" hidden>
      <div class="title" id="modalTitle">确认</div><p id="modalMsg"></p>
      <div class="grid"><button class="btn" id="modalNo">取消</button><button class="btn primary" id="modalYes">确认执行</button></div>
    </div>

    <div class="card" id="jyCard">
      <div class="row"><div class="title"><span class="dot" id="jyDot"></span>剪映自动化</div><span class="meta" id="jyMeta">就绪</span></div>
      <div class="log" id="jyLog">等待指令…</div>
      <div class="grid">
        <button class="btn" id="jyScan">AI 扫描草稿</button>
        <button class="btn primary" id="jyExport">批量导出</button>
        <button class="btn" id="jyExtract">提取字幕</button>
        <button class="btn danger" id="jyStop">紧急停止</button>
      </div>
    </div>

    <div class="card" id="wmCard">
      <div class="row"><div class="title"><span class="dot" id="wmDot"></span>批量水印</div><span class="meta" id="wmMeta">空闲</span></div>
      <div class="bar"><i id="wmBar"></i></div>
      <div class="jobs" id="wmJobs"></div>
      <div class="grid">
        <button class="btn" id="wmAdd">＋ 添加视频</button>
        <button class="btn primary" id="wmRun">开始合成</button>
      </div>
    </div>

    <div class="card">
      <div class="row"><div class="title"><span class="dot" id="pkDot"></span>剪贴板句号守护</div><button class="switch" id="pkSwitch" title="开关"></button></div>
      <span class="meta" id="pkMeta" style="max-width:none">复制到剪映的字幕自动保留标点</span>
    </div>
  </div>
  <footer>
    <button class="btn" id="launchJy">🚀 启动剪映</button>
    <button class="btn" id="openMain">🏠 打开主工作台</button>
  </footer>
  <div class="toast" id="toast"></div>
  </div>
  <script>
    const api = window.blackObsidian, $ = id => document.getElementById(id);
    let state = null, toastTimer = 0;
    const toast = msg => { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); };
    const act = async (action, value) => {
      try { const res = await api.companionAction(action, value); if (res && res.error) toast(res.error); else if (res) render(res); }
      catch (e) { toast(String(e && e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')); }
    };
    const statusText = { pending: '排队', processing: '合成中', done: '完成', error: '失败', cancelled: '取消' };
    function render(s) {
      if (!s) return; state = s;
      const jy = s.jianying || {}, wm = s.watermark || {};
      $('dockBtn').className = 'icon' + (s.autoDock ? ' on' : '');
      $('dockLabel').textContent = s.jianyingFound ? (s.autoDock ? '✓ 已吸附剪映窗口' : '已检测到剪映') : '桌面置顶 · 剪映未运行';
      const jyRun = jy.busy || jy.exporting || jy.recording;
      $('jyDot').className = 'dot ' + (jyRun ? 'run' : jy.ready ? 'on' : '');
      $('jyCard').className = 'card' + (jyRun ? ' active' : '');
      $('jyMeta').textContent = jy.status || '就绪';
      $('jyLog').textContent = jy.lastLog || jy.guide || '等待指令…';
      $('jyScan').disabled = jyRun || !jy.ready;
      $('jyExport').disabled = jyRun || !jy.ready || !jy.queueCount;
      $('jyExport').textContent = jy.queueCount ? '批量导出 (' + jy.queueCount + ')' : '批量导出';
      $('jyExtract').disabled = jyRun || !jy.ready;
      const m = jy.modal;
      $('modalCard').hidden = !m;
      if (m) { $('modalTitle').textContent = m.title || '确认'; $('modalMsg').textContent = m.message || ''; }
      $('wmDot').className = 'dot ' + (wm.running ? 'run' : wm.totalCount ? 'on' : '');
      $('wmCard').className = 'card' + (wm.running ? ' active' : '');
      $('wmMeta').textContent = wm.totalCount ? wm.completedCount + '/' + wm.totalCount + ' · ' + wm.overallProgress + '%' : '空闲';
      $('wmBar').style.width = (wm.overallProgress || 0) + '%';
      $('wmRun').textContent = wm.running ? '停止合成' : '开始合成';
      $('wmRun').className = 'btn ' + (wm.running ? 'danger' : 'primary');
      $('wmRun').disabled = !wm.running && !(wm.jobs || []).some(j => j.status !== 'done' && j.status !== 'processing');
      $('wmJobs').innerHTML = '';
      (wm.jobs || []).slice(-4).forEach(j => {
        const row = document.createElement('div'); row.className = 'job';
        const name = document.createElement('span'); name.textContent = j.fileName; name.title = j.outputPath || '';
        const st = document.createElement('b');
        st.className = j.status === 'done' ? 'done' : j.status === 'error' ? 'err' : j.status === 'processing' ? 'run' : '';
        st.textContent = j.status === 'processing' ? j.progress + '%' : statusText[j.status] || j.status;
        row.append(name, st);
        if (j.status === 'done') { row.style.cursor = 'pointer'; row.title = '点击定位成片'; row.onclick = () => act('wm-open', j.outputPath); }
        $('wmJobs').append(row);
      });
      $('pkSwitch').className = 'switch' + (s.periodEnabled ? ' on' : '');
      $('pkDot').className = 'dot ' + (s.periodEnabled ? 'on' : '');
      $('pkMeta').textContent = s.periodEnabled ? '✓ 守护中：复制字幕到剪映自动保留句号' : '已关闭：开启后复制到剪映的字幕自动保留标点';
    }
    $('closeBtn').onclick = () => act('panel', false);
    $('dockBtn').onclick = () => act('toggle-dock');
    $('jyScan').onclick = () => act('jy-scan');
    $('jyExport').onclick = () => act('jy-export');
    $('jyExtract').onclick = () => act('jy-extract');
    $('jyStop').onclick = () => act('jy-stop');
    $('modalYes').onclick = () => state?.jianying?.modal && act('jy-modal', { id: state.jianying.modal.id, confirmed: true });
    $('modalNo').onclick = () => state?.jianying?.modal && act('jy-modal', { id: state.jianying.modal.id, confirmed: false });
    $('wmAdd').onclick = () => act('wm-add');
    $('wmRun').onclick = () => act(state?.watermark?.running ? 'wm-cancel' : 'wm-start');
    $('pkSwitch').onclick = () => act('toggle-period');
    $('launchJy').onclick = () => act('launch-jy');
    $('openMain').onclick = () => act('navigate', '');
    api?.onCompanionState?.(render);
    act('sync');
  </script></body></html>`;
}

// Base64 keeps Chromium's data-URL parser away from percent-encoding edge cases in the inline markup.
const toDataUrl = html => 'data:text/html;charset=utf-8;base64,' + Buffer.from(html, 'utf8').toString('base64');

function companionHtml() {
  const orb = orbHtml();
  const panelAcrylic = panelHtml(true);
  const panelSolid = panelHtml(false);
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>月薪喵 · 剪映插件</title></head><body style="margin:0;background:transparent;overflow:hidden"><script>
    (function () {
      var params = new URLSearchParams(location.search);
      var mode = params.get('mode') === 'panel' ? 'panel' : 'orb';
      var acrylic = params.get('acrylic') !== '0';
      var html = mode === 'panel' ? (acrylic ? ${JSON.stringify(panelAcrylic)} : ${JSON.stringify(panelSolid)}) : ${JSON.stringify(orb)};
      document.open();
      document.write(html);
      document.close();
    })();
  </script></body></html>`;
}

/** Exposed for offscreen previews, static bundling, and tests. */
export const companionMarkup = { orbHtml, panelHtml, companionHtml, toDataUrl };

export function createCompanionDock({
  preloadPath,
  iconPath,
  baseUrl = '',
  getJianyingState,
  getWatermarkState,
  getPeriodStatus,
  onAction,
}) {
  let orb = null;
  let panel = null;
  let panelOpen = false;
  let autoDock = true;
  let visible = false;
  let pollTimer = null;
  let lastJianying = null;
  const acrylic = supportsAcrylic();
  const normalizedBaseUrl = typeof baseUrl === 'string' ? baseUrl.trim().replace(/\/+$/, '') : '';
  const resolveOrbUrl = () => normalizedBaseUrl ? `${normalizedBaseUrl}/companion-orb.html` : toDataUrl(orbHtml());
  const resolvePanelUrl = () => normalizedBaseUrl ? `${normalizedBaseUrl}/companion-panel.html?acrylic=${acrylic ? '1' : '0'}` : toDataUrl(panelHtml(acrylic));

  const webPreferences = { contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: false, preload: preloadPath };
  const alive = w => w && !w.isDestroyed();

  function workArea(point) {
    try {
      return (point ? screen.getDisplayNearestPoint(point) : screen.getPrimaryDisplay()).workArea;
    } catch {
      return { x: 0, y: 0, width: 1920, height: 1040 };
    }
  }

  async function ensureOrb() {
    if (alive(orb)) return orb;
    const area = workArea();
    orb = new BrowserWindow({
      x: area.x + area.width - ORB_SIZE.width - 24,
      y: area.y + area.height - ORB_SIZE.height - 28,
      ...ORB_SIZE,
      frame: false, transparent: true, resizable: false, maximizable: false, minimizable: false, fullscreenable: false,
      skipTaskbar: true, alwaysOnTop: true, hasShadow: false, focusable: true, icon: iconPath,
      webPreferences,
    });
    orb.setAlwaysOnTop(true, 'screen-saver');
    orb.on('move', () => placePanel());
    orb.on('closed', () => { orb = null; visible = false; });
    try {
      await orb.loadURL(resolveOrbUrl());
    } catch {
      if (alive(orb)) await orb.loadURL(toDataUrl(orbHtml()));
    }
    return orb;
  }

  async function ensurePanel() {
    if (alive(panel)) return panel;
    panel = new BrowserWindow({
      ...PANEL_SIZE,
      show: false, frame: false, resizable: false, maximizable: false, minimizable: false, fullscreenable: false,
      skipTaskbar: true, alwaysOnTop: true, icon: iconPath, roundedCorners: true,
      // Windows 11: real desktop acrylic blur behind the panel; older systems fall back to a solid glass tint.
      ...(acrylic ? { backgroundMaterial: 'acrylic', backgroundColor: '#00000000' } : { backgroundColor: '#14181e' }),
      webPreferences,
    });
    panel.setAlwaysOnTop(true, 'screen-saver');
    panel.on('closed', () => { panel = null; panelOpen = false; });
    try {
      await panel.loadURL(resolvePanelUrl());
    } catch {
      if (alive(panel)) await panel.loadURL(toDataUrl(panelHtml(acrylic)));
    }
    return panel;
  }

  function placePanel() {
    if (!alive(panel) || !alive(orb) || !panelOpen) return;
    const [ox, oy] = orb.getPosition();
    const area = workArea({ x: ox, y: oy });
    let x = ox - PANEL_SIZE.width - 8;
    if (x < area.x) x = ox + ORB_SIZE.width + 8;
    let y = oy + ORB_SIZE.height - PANEL_SIZE.height;
    y = Math.max(area.y + 8, Math.min(y, area.y + area.height - PANEL_SIZE.height - 8));
    x = Math.max(area.x + 8, Math.min(x, area.x + area.width - PANEL_SIZE.width - 8));
    panel.setBounds({ x: Math.round(x), y: Math.round(y), ...PANEL_SIZE }, false);
  }

  async function snapshot() {
    let jy = null, wm = null, period = null;
    try { jy = await getJianyingState?.(); } catch { jy = lastJianying; }
    if (jy) lastJianying = jy;
    try { wm = await getWatermarkState?.(); } catch { /* ignore */ }
    try { period = await getPeriodStatus?.(); } catch { /* ignore */ }
    const jw = jy?.jianyingWindow || {};
    const logs = Array.isArray(jy?.logs) ? jy.logs : [];
    return {
      visible, panelOpen, autoDock, acrylic,
      jianyingFound: Boolean(jw.found && !jw.minimized),
      jianyingWindow: jw,
      jianying: {
        ready: Boolean(jy?.ready), busy: Boolean(jy?.busy), exporting: Boolean(jy?.exporting), recording: Boolean(jy?.recording),
        status: jy?.status || '引擎预热中…', guide: jy?.guide || '', modal: jy?.modal || null,
        queueCount: Array.isArray(jy?.queue) ? jy.queue.length : 0,
        lastLog: logs.length ? String(logs[logs.length - 1]) : '',
      },
      watermark: wm || { running: false, totalCount: 0, completedCount: 0, overallProgress: 0, jobs: [] },
      periodEnabled: Boolean(period?.enabled),
    };
  }

  async function broadcastState() {
    const snap = await snapshot();
    for (const w of [orb, panel]) if (alive(w)) w.webContents.send('bos:companion-state', snap);
    return snap;
  }

  async function tick() {
    if (!visible || !alive(orb)) return;
    const snap = await broadcastState();
    const jw = snap.jianyingWindow;
    if (autoDock && jw?.found && !jw.minimized && jw.width > 300 && jw.height > 300) {
      const x = jw.x + jw.width - ORB_SIZE.width - 16;
      const y = jw.y + 44;
      const [cx, cy] = orb.getPosition();
      if (Math.abs(cx - x) > 3 || Math.abs(cy - y) > 3) orb.setPosition(Math.round(x), Math.round(y), false);
    }
  }

  function startLoop() {
    if (!pollTimer) pollTimer = setInterval(() => { void tick(); }, 1200);
  }
  function stopLoop() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  async function setPanel(open) {
    panelOpen = open === 'toggle' ? !panelOpen : Boolean(open);
    if (panelOpen) {
      const p = await ensurePanel();
      placePanel();
      p.show();
      p.moveTop?.();
      p.focus();
    } else if (alive(panel)) {
      panel.hide();
    }
    return broadcastState();
  }

  async function show(openPanel = false) {
    visible = true;
    const o = await ensureOrb();
    o.showInactive();
    o.moveTop?.();
    startLoop();
    if (openPanel) await setPanel(true);
    return broadcastState();
  }

  async function hide() {
    visible = false;
    stopLoop();
    if (alive(panel)) panel.hide();
    panelOpen = false;
    if (alive(orb)) orb.hide();
    return snapshot();
  }

  async function toggle() {
    // When invoked from the main window's "🐱 月薪喵" button or tray:
    // if the plugin panel is not currently open, show the orb AND pop open the frosted-glass panel on top.
    if (!visible || !alive(orb) || !orb.isVisible() || !panelOpen || !alive(panel) || !panel.isVisible()) {
      return show(true);
    }
    return hide();
  }

  async function handleAction(action, value) {
    if (action === 'sync') return broadcastState();
    if (action === 'show') return show(Boolean(value));
    if (action === 'hide') return hide();
    if (action === 'toggle') return toggle();
    if (action === 'panel' || action === 'expand') return setPanel(value);
    if (action === 'move-by') {
      if (alive(orb)) {
        autoDock = false;
        const [cx, cy] = orb.getPosition();
        const dx = Number(value?.dx) || 0;
        const dy = Number(value?.dy) || 0;
        orb.setPosition(Math.round(cx + dx), Math.round(cy + dy), false);
        placePanel();
      }
      return broadcastState();
    }
    if (action === 'toggle-dock') { autoDock = !autoDock; await tick(); return broadcastState(); }
    try {
      await onAction?.(action, value);
    } catch (error) {
      const snap = await broadcastState();
      return { ...snap, error: String(error?.message || error || '操作失败').replace(/^Error:\s*/, '') };
    }
    return broadcastState();
  }

  function dispose() {
    stopLoop();
    for (const w of [panel, orb]) if (alive(w)) { try { w.destroy(); } catch { /* ignore */ } }
    panel = null;
    orb = null;
  }

  return { show, hide, toggle, handleAction, broadcastState, dispose };
}
