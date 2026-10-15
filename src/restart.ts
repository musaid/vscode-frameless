import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { appRoot } from './paths.js';

/**
 * Electron BrowserWindow options are read once at process start, so a window reload
 * is not enough. Quit the app, wait until it's gone, relaunch via its CLI shim.
 */
export const relaunch = (): void => {
  const { nameLong } = JSON.parse(fs.readFileSync(`${appRoot}/product.json`, 'utf8')) as { nameLong: string };
  // Not derived from process.execPath: the extension host runs from the nested
  // `Code Helper (Plugin).app`, which has no bin/ of its own.
  const binDir = path.join(appRoot, 'bin');
  const cli = fs.readdirSync(binDir).find((f) => !f.includes('-tunnel'));
  if (!cli) throw new Error(`No CLI launcher found in ${binDir}`);

  const script = [
    `quit app "${nameLong}"`,
    'repeat with i from 1 to 100',
    `if not (application "${nameLong}" is running) then exit repeat`,
    'delay 0.1',
    'end repeat',
    `do shell script quoted form of "${binDir}/${cli}"`,
  ].flatMap((line) => ['-e', line]);

  spawn('osascript', script, { detached: true, stdio: 'ignore' }).unref();
};
