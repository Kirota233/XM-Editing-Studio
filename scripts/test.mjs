import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
await fs.mkdir('.generated/tests', { recursive: true });
if (
  process.platform === 'win32' &&
  (!existsSync('app/build/jianying/JianYingEngine.exe') ||
    !existsSync('app/build/watermark/WatermarkEngine.exe') ||
    !existsSync('.generated/native/helpers/PeriodKeeper.exe'))
) {
  const buildNative = spawnSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/build-native.ps1'],
    { stdio: 'inherit', windowsHide: true }
  );
  if (buildNative.status !== 0) {
    process.exitCode = buildNative.status ?? 1;
    process.exit(process.exitCode);
  }
}
const files = (await fs.readdir('tests')).filter(name => /^test-.*\.mjs$/.test(name)).sort().map(name => `tests/${name}`);
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
