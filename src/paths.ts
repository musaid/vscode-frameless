import fs from 'node:fs';
import path from 'node:path';
import { env } from 'vscode';

const BAK_SUFFIX = '.frameless-bak';

export interface PatchTarget {
  readonly src: string;
  readonly bak: string;
}

const target = (src: string): PatchTarget => ({ src, bak: `${src}${BAK_SUFFIX}` });

/** `<app>/Contents/Resources/app` — product.json lives here. */
export const appRoot = env.appRoot;

/** `<appRoot>/out` — every patched file lives under here. */
export const outDir = path.join(appRoot, 'out');

export const productJson = target(path.join(appRoot, 'product.json'));

/** Electron main-process bundle; name has moved between releases. */
export const mainJs: PatchTarget = (() => {
  const candidates = [
    path.join(outDir, 'vs', 'code', 'electron-main', 'main.js'),
    path.join(outDir, 'mainImpl.js'),
    path.join(outDir, 'main.js'),
  ];
  return target(candidates.find((p) => fs.existsSync(p)) ?? candidates[0]!);
})();

/** Workbench HTML directory; renamed from electron-sandbox to electron-browser in 2025. */
export const workbenchDir: string = (() => {
  const candidates = ['electron-browser', 'electron-sandbox'].map((d) =>
    path.join(outDir, 'vs', 'code', d, 'workbench'),
  );
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0]!;
})();

export const workbenchHtml = target(path.join(workbenchDir, 'workbench.html'));

/** Files we *add* next to workbench.html (no backup; removed on restore). */
export const injectedJs = path.join(workbenchDir, 'frameless.js');
export const injectedCss = path.join(workbenchDir, 'frameless.css');

/** Custom watermark image. Keeps its own extension so it is served with the right MIME type. */
const WATERMARK = 'frameless-watermark';
export const injectedWatermark = (ext: string): string => path.join(workbenchDir, `${WATERMARK}${ext}`);
export const existingWatermarks = (): string[] =>
  fs.readdirSync(workbenchDir).filter((f) => f.startsWith(`${WATERMARK}.`)).map((f) => path.join(workbenchDir, f));

export const allTargets: readonly PatchTarget[] = [mainJs, workbenchHtml, productJson];
