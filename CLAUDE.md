# frameless — context for Claude Code

macOS-only VS Code extension. One job: hide the title bar, place the traffic lights at the left of the editor tab row, keep the window draggable from the empty tab strip. Opinionated; two settings: `frameless.trafficLights` and `frameless.watermark` (custom empty-editor logo). Renamed from Headroom on 2026-10-15.

## Why it exists

- apc-extension did this by monkey-patching VS Code's AMD modules at runtime; died with the ESM move in 1.95.
- vscode-custom-ui-style string-patches the built files and still works, but only sets Electron options; it has no renderer-side layout, so the lights overlap the tabs.
- frameless = custom-ui-style's patching approach (minimal) + apc's layout (ported to a MutationObserver script).

## Mechanism

1. `src/patch.ts` patches three files under `env.appRoot`, backups beside them (`*.frameless-bak`):
   - `out/vs/code/electron-main/main.js` (`out/mainImpl.js` on 1.141): appends `titleBarStyle:"hidden",trafficLightPosition:{x,y}` after the anchor `experimentalDarkMode:!0` inside the BrowserWindow options literal. `hidden`, not `hiddenInset`: hiddenInset adds an NSToolbar, which gets macOS 26's larger toolbar-window corner radius.
   - `out/vs/code/electron-browser/workbench/workbench.html`: adds `<link frameless.css>` + `<script frameless.js>` after the workbench entry script. Files are copied next to it (`vscode-file://` scheme; CSP allows it). A `frameless.watermark` image is copied there too as `frameless-watermark.<ext>` and overrides `.letterpress` after the theme.
   - `product.json`: SHA-256 checksums recomputed (base64, trailing `=` stripped) so VS Code doesn't flag the install as corrupt. Must run last.
2. `src/extension.ts` also sets `window.titleBarStyle: native` and `window.customTitleBarVisibility: never` — otherwise VS Code's own `options.titleBarStyle = 'hidden'` overrides the injected option.
3. `src/renderer/layout.ts` runs in the workbench: finds the editor group whose bounding rect is top-left, prepends a spacer (`--frameless-traffic-x + 68px`) into its `.tabs-and-actions-container`, sets `-webkit-app-region: drag` on the empty strip and `no-drag` on tabs. Handles the empty-editor case and fullscreen.
4. `src/uninstall.ts` runs via `vscode:uninstall` with no `vscode` API; restores from `~/.frameless/manifest.json`.
5. Electron options are read at process start, so Apply always offers a full relaunch (`src/restart.ts`, osascript).

## Verified / unverified

- Verified: esbuild bundles, both tsconfigs typecheck, apply/restore round-trip against a fake install tree (idempotent, checksums recompute, pristine restore).
- Verified 2026-10-15 against the installed stable 1.141.2 (`/Applications/Visual Studio Code.app`): main bundle is `out/mainImpl.js`, `experimentalDarkMode:!0` occurs once; workbench.html anchor present; checksum algorithm reproduces Microsoft's values. Re-check after updates: `grep -c 'experimentalDarkMode:!0' "/Applications/Visual Studio Code.app/Contents/Resources/app/out/mainImpl.js"`. If missing, `patchMain` throws before writing anything.
- Verified live (as Headroom, hiddenInset): lights sit left of the tabs. NOT yet verified: `hidden` corner radius, drag with no editors open, watermark override. Tuning knobs: `trafficLights.y` for vertical centering on the 35px tab bar; spacer width if `window.zoomLevel ≠ 0` (traffic lights are in points, spacer in CSS px).

## First run checklist

1. Run custom-ui-style's **"Rollback, cleanup and restart instantly"** (plain Rollback keeps its backups, and its uninstall hook would copy them back over Frameless on the next launch), uninstall it, quit and relaunch once, remove `custom-ui-style.*` from settings. `apply()` refuses while any `*custom-ui-style*` file or its script tags remain.
2. `pnpm install && pnpm package && code --install-extension frameless-0.1.0.vsix`
3. Accept **Apply**, then **Relaunch**.
4. `Frameless: Restore VS Code files` undoes everything if it goes wrong.

## Conventions

- TypeScript, explicit types, functional style, early returns. Keep each file readable top-to-bottom; no abstractions for one call site.
- `assets/theme.css` is the user's former `custom-ui-style.stylesheet`, moved verbatim. Don't restyle it unasked.
- The `src/renderer/` tree has its own tsconfig (`lib: dom`, no node); keep the two worlds separate.
