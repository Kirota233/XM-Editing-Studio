import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packager } from '@electron/packager';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

for (const file of ['app/dist/client/index.html', '.generated/native/helpers/PeriodKeeper.exe', 'app/build/jianying/JianYingEngine.exe', 'app/build/jianying/engine.json']) {
  await fs.access(file);
}

const stage = path.join(root, '.generated', `package-${Date.now()}`);
await fs.mkdir(stage, { recursive: true });

try {
  for (const folder of ['electron', 'server', 'shared', 'dist', 'build']) {
    await fs.cp(path.join('app', folder), path.join(stage, folder), { recursive: true });
  }
  // Remove unreferenced 1.9MB decorative PNG from staged bundle
  await fs.rm(path.join(stage, 'dist', 'client', 'assets', 'provider-portal-scene.png'), { force: true });

  const metadata = JSON.parse(await fs.readFile('app/package.json', 'utf8'));
  metadata.author ||= '小马';
  delete metadata.dependencies;
  await fs.writeFile(path.join(stage, 'package.json'), JSON.stringify(metadata, null, 2));
  await fs.copyFile('app/THIRD_PARTY_NOTICES.txt', path.join(stage, 'THIRD_PARTY_NOTICES.txt'));

  const result = await packager({
    dir: stage,
    out: 'artifacts',
    name: 'XM剪辑台',
    executableName: '小马剪辑台',
    platform: 'win32',
    arch: 'x64',
    electronVersion: '44.9.2',
    icon: 'app/assets/app-icon.ico',
    appVersion: metadata.version,
    buildVersion: metadata.version,
    asar: true,
    overwrite: true,
    prune: false,
    extraResource: ['.generated/native/helpers'],
  });

  // Prune unused Chromium locales and unused WebGPU compiler DLLs to reduce package size
  const keepLocales = new Set(['zh-CN.pak', 'zh-TW.pak', 'en-US.pak', 'en-GB.pak', 'es.pak', 'es-419.pak']);
  for (const outDir of result) {
    const localesDir = path.join(outDir, 'locales');
    try {
      const entries = await fs.readdir(localesDir);
      for (const entry of entries) {
        if (!keepLocales.has(entry)) {
          await fs.rm(path.join(localesDir, entry), { force: true });
        }
      }
    } catch { /* ignore */ }

    for (const bloatFile of ['LICENSES.chromium.html', 'dxcompiler.dll', 'dxil.dll']) {
      await fs.rm(path.join(outDir, bloatFile), { force: true }).catch(() => {});
    }
  }

  console.log(result.join('\n'));
} finally {
  await fs.rm(stage, { recursive: true, force: true }).catch(() => {});
}
