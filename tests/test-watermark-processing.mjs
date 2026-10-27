import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { createWatermarkHost } from '../app/electron/watermark-host.mjs';

test('Native C# WatermarkEngine.exe binary exists, is compact (< 100KB), and verifies Windows Media Foundation runtime', async () => {
  if (process.platform !== 'win32') return;
  const exePath = path.resolve('app/build/watermark/WatermarkEngine.exe');
  const manifestPath = path.resolve('app/build/watermark/engine.json');
  const st = await fs.stat(exePath);
  assert.ok(st.isFile(), 'WatermarkEngine.exe must exist');
  assert.ok(st.size > 4096 && st.size < 102400, `WatermarkEngine.exe should be compact (<100KB), got ${st.size} bytes`);

  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  assert.match(manifest.sha256, /^[a-f0-9]{64}$/);

  const output = execFileSync(exePath, ['--verify-runtime'], { encoding: 'utf8', windowsHide: true }).trim();
  const parsed = JSON.parse(output);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.engine, 'windows-media-foundation-hw');
});

test('createWatermarkHost manages video batch queue, settings persistence, output path resolution, and clean disposal', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xm-wm-host-test-'));
  try {
    const sampleA = path.join(root, '样片A.mp4');
    const sampleB = path.join(root, '样片B.mov');
    const outDir = path.join(root, 'output');
    await fs.writeFile(sampleA, 'fake-mp4-data-a');
    await fs.writeFile(sampleB, 'fake-mp4-data-b');
    await fs.mkdir(outDir, { recursive: true });

    const states = [];
    const host = createWatermarkHost({
      appDirectory: path.resolve('app'),
      dataDirectory: root,
      onStateChange: s => states.push(s),
    });

    try {
      const initial = await host.getState();
      assert.equal(initial.engine, 'windows-media-foundation-hw');
      assert.equal(initial.totalCount, 0);
      assert.equal(initial.settings.position, 'tile');

      // Add videos and verify deduplication of pending paths
      const afterAdd = await host.addVideos([sampleA, sampleB, sampleA]);
      assert.equal(afterAdd.totalCount, 2);
      assert.equal(afterAdd.jobs[0].fileName, '样片A.mp4');
      assert.equal(afterAdd.jobs[0].outputPath, path.join(root, '样片A_watermarked.mp4'));

      // Update settings and verify pending job output paths update automatically
      const afterSettings = await host.updateSettings({
        watermarkText: 'XM 初剪审阅',
        position: 'bottom-right',
        opacity: 0.5,
        scale: 0.35,
        size: '720p',
        crf: 28,
        outputDir: outDir,
        suffix: '_审片版',
      });
      assert.equal(afterSettings.settings.watermarkText, 'XM 初剪审阅');
      assert.equal(afterSettings.settings.position, 'bottom-right');
      assert.equal(afterSettings.jobs[0].outputPath, path.join(outDir, '样片A_审片版.mp4'));

      // Remove one job and clear remaining
      const afterRemove = await host.removeJob(afterSettings.jobs[0].id);
      assert.equal(afterRemove.totalCount, 1);
      assert.equal(afterRemove.jobs[0].fileName, '样片B.mov');

      const afterClear = await host.clearJobs('all');
      assert.equal(afterClear.totalCount, 0);
      assert.ok(states.length >= 4);

      // Verify settings persisted on disk
      const hostReloaded = createWatermarkHost({
        appDirectory: path.resolve('app'),
        dataDirectory: root,
      });
      const reloadedState = await hostReloaded.getState();
      assert.equal(reloadedState.settings.watermarkText, 'XM 初剪审阅');
      assert.equal(reloadedState.settings.suffix, '_审片版');
      await hostReloaded.dispose();
    } finally {
      await host.dispose();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('Native WatermarkStudio UI and Bottom-Right Radial BatchTray render without web-wrapper iframe', async () => {
  const saved = new Map();
  globalThis.localStorage = {
    getItem: key => saved.get(key) || null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: key => saved.delete(key),
  };
  globalThis.i = {
    createElement: (type, props, ...children) =>
      typeof type === 'function' ? type({ ...(props || {}), children }) : { type, props: props || {}, children },
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: () => {},
    useMemo: fn => fn(),
    useRef: value => ({ current: value }),
    useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
  };

  const compiled = await build({
    entryPoints: ['app/src/upgrade.tsx'],
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'esm',
    jsxFactory: 'i.createElement',
    jsxFragment: 'i.Fragment',
  });
  const ui = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));

  function nodes(tree, predicate) {
    if (!tree || typeof tree !== 'object') return [];
    return [
      ...(predicate(tree) ? [tree] : []),
      ...(tree.children || []).flat(Infinity).flatMap(child => nodes(child, predicate)),
    ];
  }
  const textOf = tree =>
    (tree?.children || [])
      .flat(Infinity)
      .map(child => (typeof child === 'object' ? textOf(child) : child ?? ''))
      .join('');

  // 1. Verify WatermarkStudio has NO iframe and renders native controls
  const wmTree = ui.WatermarkStudio({ active: true });
  assert.equal(nodes(wmTree, n => n.type === 'iframe').length, 0, 'WatermarkStudio must not use an iframe web wrapper');
  const wmText = textOf(wmTree);
  assert.match(wmText, /实时画面水印预览/);
  assert.match(wmText, /C# 原生硬件加速/);
  assert.match(wmText, /满屏斜纹防盗/);
  assert.match(wmText, /批量视频处理队列/);

  // 2. Verify BatchTray renders bottom-right radial orb + 5 surrounding satellite nodes
  const trayTree = ui.BatchTray({ activeTab: 'watermark', onNavigate: () => {}, automation: { jobs: [] } });
  const satellites = nodes(trayTree, n => n.type === 'button' && String(n.props.className || '').includes('bos-tray-sat'));
  assert.equal(satellites.length, 5, 'BatchTray must render 5 surrounding radial satellite action buttons');
  const trayText = textOf(trayTree);
  assert.match(trayText, /水印/);
  assert.match(trayText, /剪映/);
  assert.match(trayText, /配乐/);
  assert.match(trayText, /句号/);
  assert.match(trayText, /AI 台/);
});
