// Runs via package.json `vscode:uninstall` on the next launch after the extension is removed.
// No `vscode` module here, so everything comes from the manifest written at apply time.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Manifest } from './patch.js';

const manifestPath = path.join(os.homedir(), '.frameless', 'manifest.json');

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;
  for (const { src, bak } of manifest.restore) {
    if (fs.existsSync(bak)) fs.renameSync(bak, src);
  }
  for (const f of manifest.remove) {
    if (fs.existsSync(f)) fs.rmSync(f);
  }
  fs.rmSync(manifestPath);
} catch {
  // Nothing applied, or already restored — nothing to do.
}
