import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
await fs.rm('app/dist/client/watermarker', { recursive: true, force: true }).catch(() => {});
await fs.mkdir('app/dist/client/assets', { recursive: true });
await fs.cp('app/public', 'app/dist/client', { recursive: true });
await fs.mkdir('app/build', { recursive: true });
for (const name of ['app-icon.ico', 'app-icon.png']) await fs.copyFile(`app/assets/${name}`, `app/build/${name}`);
await import('../app/scripts/build-upgrade.mjs');
console.log('Renderer and native UI built. Native Windows helpers: npm run build:native');
