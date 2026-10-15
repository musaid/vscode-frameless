import { build, context } from 'esbuild';

const watch = process.argv.includes('--watch');

const targets = [
  {
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    platform: 'node',
    format: 'cjs',
    external: ['vscode'],
  },
  {
    entryPoints: ['src/uninstall.ts'],
    outfile: 'dist/uninstall.js',
    platform: 'node',
    format: 'cjs',
  },
  {
    // Runs inside the workbench renderer; no vscode API, no node.
    entryPoints: ['src/renderer/layout.ts'],
    outfile: 'dist/frameless.js',
    platform: 'browser',
    format: 'iife',
  },
].map((t) => ({ ...t, bundle: true, target: 'es2022', sourcemap: false, logLevel: 'info' }));

if (watch) {
  for (const t of targets) (await context(t)).watch();
} else {
  await Promise.all(targets.map(build));
}
