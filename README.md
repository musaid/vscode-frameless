# Frameless

macOS only. Hides the VS Code title bar, pins the traffic lights to the left of the editor tabs, and keeps the window draggable from the empty tab strip. Nothing else.

Built for a layout with the activity bar hidden, status bar hidden and sidebar on the right, so the editor tab bar is always the top-left element of the window.

## How it works

There is no API for this, so Frameless patches three files inside `Code.app` (backups kept beside them with a `.frameless-bak` suffix):

| File | Change |
| --- | --- |
| `out/vs/code/electron-main/main.js` | Injects `titleBarStyle: "hidden"` and `trafficLightPosition` into the `BrowserWindow` options literal |
| `out/vs/code/electron-browser/workbench/workbench.html` | Adds `frameless.js` (tab-bar spacer + drag regions) and `frameless.css` (your `frameless.stylesheet`, if set) |
| `product.json` | Recomputes checksums so VS Code doesn't report the install as corrupt |

It also sets `window.titleBarStyle: native` and `window.customTitleBarVisibility: never` in user settings — VS Code overrides Electron's `titleBarStyle` whenever it draws its own title bar, so these are part of the layout.

## Install

Download `frameless-<version>.vsix` from [Releases](https://github.com/musaid/vscode-frameless/releases), then:

```sh
code --install-extension frameless-<version>.vsix
```

Using profiles? Install it into each profile you open windows with (`--profile <name>`). If [vscode-custom-ui-style](https://github.com/subframe7536/vscode-custom-ui-style) is applied, run its **Rollback, cleanup and restart instantly** and uninstall it first; Frameless refuses to apply over it.

## Use

1. Install the `.vsix`. On first activation it offers **Apply**; accept, then **Relaunch**.
2. After every VS Code update it offers Apply again (the update replaces the patched files).
3. `Frameless: Restore VS Code files` undoes everything. Uninstalling the extension restores on the next launch.

Settings (run Apply after changing any). Both are application-wide, like the patch itself: workspace settings can't set them, and in other profiles VS Code reads them from the Default profile.

- `frameless.trafficLights`: `{ x, y }`, default `{ 10, 14 }`.
- `frameless.stylesheet`: path to a CSS file applied to the workbench; empty by default. [`examples/one-dark.css`](examples/one-dark.css) is a full theme to start from (One Dark colours, Operator Mono Lig). It's copied in at Apply, so re-run Apply after editing it.
- `frameless.watermark`: path to an SVG/PNG/JPG/WebP shown in the empty editor; empty keeps VS Code's logo, or the one your stylesheet sets.

## Build

```sh
pnpm install
pnpm package      # → frameless-<version>.vsix
```

## Credits

The patching approach follows [vscode-custom-ui-style](https://github.com/subframe7536/vscode-custom-ui-style) (string-patching the built files, checksum fix via [vscode-fix-checksums](https://github.com/RimuruChan/vscode-fix-checksums)); the tab-bar spacer and drag-region layout is a port of [apc-extension](https://github.com/drcika/apc-extension). Both MIT.
