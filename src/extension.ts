import os from 'node:os';
import path from 'node:path';
import * as vscode from 'vscode';
import { apply, dropBackups, hasBackups, isPatched, restore, type TrafficLights } from './patch.js';
import { relaunch } from './restart.js';

const APPLIED_VERSION = 'frameless.appliedVersion';

const readTrafficLights = (): TrafficLights => {
  const v = vscode.workspace.getConfiguration('frameless').get<Partial<TrafficLights>>('trafficLights');
  return { x: v?.x ?? 10, y: v?.y ?? 14 };
};

const readWatermark = (): string | undefined => {
  const v = vscode.workspace.getConfiguration('frameless').get<string>('watermark')?.trim();
  if (!v) return undefined;
  return v.startsWith('~/') ? path.join(os.homedir(), v.slice(2)) : v;
};

/**
 * VS Code overrides Electron's `titleBarStyle` when it draws its own title bar,
 * so the injected option only survives with the native style. These two settings
 * are part of the layout, not user preference.
 */
const ensureWindowSettings = async (): Promise<void> => {
  const win = vscode.workspace.getConfiguration('window');
  if (win.get('titleBarStyle') !== 'native') {
    await win.update('titleBarStyle', 'native', vscode.ConfigurationTarget.Global);
  }
  if (win.get('customTitleBarVisibility') !== 'never') {
    await win.update('customTitleBarVisibility', 'never', vscode.ConfigurationTarget.Global);
  }
};

const run = async (label: string, fn: () => unknown): Promise<boolean> => {
  try {
    await fn();
    return true;
  } catch (e) {
    vscode.window.showErrorMessage(`Frameless: ${label} failed — ${(e as Error).message}`);
    return false;
  }
};

const offerRelaunch = async (what: string): Promise<void> => {
  const pick = await vscode.window.showInformationMessage(`Frameless: ${what}. Relaunch to take effect.`, 'Relaunch');
  if (pick === 'Relaunch') await run('relaunch', relaunch);
};

export const activate = (ctx: vscode.ExtensionContext): void => {
  if (process.platform !== 'darwin') {
    vscode.window.showWarningMessage('Frameless only does anything on macOS.');
    return;
  }

  const doApply = async (): Promise<void> => {
    const ok = await run('apply', async () => {
      await ensureWindowSettings();
      apply({
        trafficLights: readTrafficLights(),
        rendererScript: path.join(ctx.extensionPath, 'dist', 'frameless.js'),
        themeCss: path.join(ctx.extensionPath, 'assets', 'theme.css'),
        watermark: readWatermark(),
      });
    });
    if (!ok) return;
    await ctx.globalState.update(APPLIED_VERSION, vscode.version);
    await offerRelaunch('applied');
  };

  const doRestore = async (): Promise<void> => {
    if (!(await run('restore', restore))) return;
    await ctx.globalState.update(APPLIED_VERSION, undefined);
    await offerRelaunch('VS Code files restored');
  };

  // Every window runs its own copy of this extension. Only the focused one asks, so there is
  // one prompt per change and two windows never apply at the same time.
  const offerApply = async (reason: string): Promise<void> => {
    if (!vscode.window.state.focused) return;
    const pick = await vscode.window.showInformationMessage(`Frameless: ${reason}. Apply now?`, 'Apply');
    if (pick === 'Apply') await doApply();
  };

  /** Offers Apply once this window has focus, unless another window has applied by then. */
  const offerApplyWhenFocused = (reason: string): void => {
    const offer = (): void => {
      if (!isPatched()) void offerApply(reason);
    };
    if (vscode.window.state.focused) return offer();
    const sub = vscode.window.onDidChangeWindowState((s) => {
      if (!s.focused) return;
      sub.dispose();
      offer();
    });
    ctx.subscriptions.push(sub);
  };

  ctx.subscriptions.push(
    vscode.commands.registerCommand('frameless.apply', doApply),
    vscode.commands.registerCommand('frameless.restore', doRestore),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('frameless')) void offerApply('settings changed');
    }),
  );

  const startup = async (): Promise<void> => {
    // A VS Code update replaces the patched files; backups from the old build are now stale.
    const applied = ctx.globalState.get<string>(APPLIED_VERSION);
    if (applied !== undefined && applied !== vscode.version) {
      if (await run('cleanup', dropBackups)) offerApplyWhenFocused(`VS Code updated to ${vscode.version}`);
      return;
    }
    if (isPatched()) return;
    // A failed apply can leave some files patched; put the originals back before offering a clean one.
    if (hasBackups() && !(await run('cleanup', restore))) return;
    offerApplyWhenFocused('not applied yet');
  };
  void startup();
};

export const deactivate = (): void => {};
