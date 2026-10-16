# Frameless

Hides the VS Code title bar on macOS and puts the traffic lights next to your editor tabs. Drag the empty part of the tab bar to move the window.

I built it for a layout with the activity bar hidden and the sidebar on the right, so the tabs sit in the top-left corner.

## Install

Install it from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=musaid.frameless), or run:

```sh
code --install-extension musaid.frameless
```

The `.vsix` is also on [Releases](https://github.com/musaid/vscode-frameless/releases).

Click **Apply** when it asks, then **Relaunch**.

- Using profiles? Install it in each one.
- Using Custom UI Style? Run its **Rollback, cleanup and restart instantly** and uninstall it first.

## Settings

| Setting | What it does |
| --- | --- |
| `frameless.trafficLights` | Where the traffic lights sit. Default `{ "x": 10, "y": 14 }`. |
| `frameless.stylesheet` | Your own CSS file. Empty by default. [examples/one-dark.css](examples/one-dark.css) is mine. |
| `frameless.watermark` | An image for the empty editor (SVG, PNG, JPG or WebP). |

Run **Frameless: Apply** after changing any of them. They apply to every profile.

## How it works

VS Code has no API for this, so Frameless edits three files inside the app and keeps a backup of each:

- `main.js` hides the title bar and moves the traffic lights.
- `workbench.html` loads a small script that makes room for the lights, plus your stylesheet.
- `product.json` gets updated checksums, so VS Code doesn't call itself corrupt.

It also sets `window.titleBarStyle` to `native`, which it needs.

A VS Code update replaces those files, so Frameless asks to apply again afterwards.

## Undo

Run **Frameless: Restore VS Code files**, or uninstall it. Both put the original files back.

## Build

```sh
pnpm install
pnpm package
```

## Credits

The file patching follows [Custom UI Style](https://github.com/subframe7536/vscode-custom-ui-style). The tab bar layout comes from [APC](https://github.com/drcika/apc-extension).
