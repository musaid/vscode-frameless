/**
 * Runs inside the VS Code workbench (injected via workbench.html).
 *
 * With `titleBarStyle: hidden` and the native VS Code title bar hidden, macOS paints
 * the traffic lights over whatever sits top-left — the editor tab bar. VS Code does not know
 * to make room, so we:
 *   1. prepend a spacer into the tab bar of whichever editor group is top-left, and
 *   2. make the empty part of that tab bar a window drag region (tabs stay clickable).
 *
 * The spacer width is `--frameless-traffic-x + 68px` (x offset + the 60px light cluster on macOS 26 + an 8px gap),
 * the same constant apc-extension used. `--frameless-traffic-x` is set in frameless.css.
 */

const SPACER = 'frameless-spacer';
const TOP_LEFT = 'frameless-top-left';
const DRAGGING = 'frameless-dragging';
const TOP_EDGE_PX = 30; // a group whose tab bar starts within this of the window top is "top"

const css = `
  .${SPACER} {
    flex: 0 0 calc(var(--frameless-traffic-x, 10px) + 68px);
    height: 100%;
    -webkit-app-region: drag;
  }

  /* empty strip drags the window; interactive children opt out */
  .monaco-workbench .${TOP_LEFT} .tabs-and-actions-container > .monaco-scrollable-element {
    -webkit-app-region: drag;
  }
  .monaco-workbench .${TOP_LEFT} .tab,
  .monaco-workbench .${TOP_LEFT} .tabs-and-actions-container .scrollbar,
  .monaco-workbench .${TOP_LEFT} .editor-actions {
    -webkit-app-region: no-drag;
  }

  /* no editors open: no tab bar exists, so give the watermark a drag strip */
  .monaco-workbench .editor-group-container.empty.${TOP_LEFT} {
    position: relative;
  }
  .monaco-workbench .editor-group-container.empty.${TOP_LEFT}::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 35px;
    -webkit-app-region: drag;
  }

  /* window-drag regions swallow HTML5 drag events; lift them while something is being dragged */
  .${DRAGGING} .monaco-workbench .${TOP_LEFT} .tabs-and-actions-container > .monaco-scrollable-element,
  .${DRAGGING} .${SPACER},
  .${DRAGGING} .monaco-workbench .editor-group-container.empty.${TOP_LEFT}::before {
    -webkit-app-region: no-drag;
  }

  /* macOS hides the lights in fullscreen */
  .monaco-workbench.fullscreen .${SPACER},
  .monaco-workbench.fullscreen .editor-group-container.empty.${TOP_LEFT}::before {
    display: none;
  }
  .monaco-workbench.fullscreen .${TOP_LEFT} .tabs-and-actions-container > .monaco-scrollable-element {
    -webkit-app-region: no-drag;
  }
`;

const isTopLeft = (el: Element): boolean => {
  const { top, left } = el.getBoundingClientRect();
  return top < TOP_EDGE_PX && left < TOP_EDGE_PX;
};

const sync = (): void => {
  const groups = document.querySelectorAll<HTMLElement>('.monaco-workbench .part.editor .editor-group-container');
  for (const group of groups) {
    const topLeft = isTopLeft(group);
    group.classList.toggle(TOP_LEFT, topLeft);

    const tabBar = group.querySelector<HTMLElement>('.tabs-and-actions-container');
    const spacer = tabBar?.querySelector<HTMLElement>(`.${SPACER}`) ?? null;

    if (topLeft && tabBar && !spacer) {
      const el = document.createElement('div');
      el.className = SPACER;
      tabBar.prepend(el);
    } else if (!topLeft && spacer) {
      spacer.remove();
    }
  }
};

// Editor contents (text, cursors, widgets) change on every keystroke and can't move a group.
const isLayoutChange = (r: MutationRecord): boolean =>
  !(r.target instanceof Element && r.target.closest('.editor-container'));

// dragenter/dragleave fire per element, so count them; zero means the drag left the window.
let dragDepth = 0;
const setDragging = (on: boolean): void => {
  document.documentElement.classList.toggle(DRAGGING, on);
};
const trackDrags = (): void => {
  document.addEventListener('dragenter', () => {
    dragDepth++;
    setDragging(true);
  }, true);
  document.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) setDragging(false);
  }, true);
  for (const type of ['drop', 'dragend']) {
    document.addEventListener(type, () => {
      dragDepth = 0;
      setDragging(false);
    }, true);
  }
};

let frame = 0;
const schedule = (): void => {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    sync();
  });
};

const start = (): void => {
  // Watch only the editor part: sidebar, panel and terminal churn can't move an editor group.
  const editorPart = document.querySelector<HTMLElement>('.monaco-workbench .part.editor');
  if (!editorPart) {
    setTimeout(start, 100);
    return;
  }
  const style = document.createElement('style');
  style.id = 'frameless-layout';
  style.textContent = css;
  document.head.append(style);

  new MutationObserver((records) => {
    if (records.some(isLayoutChange)) schedule();
  }).observe(editorPart, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
  new ResizeObserver(schedule).observe(editorPart);
  trackDrags();
  sync();
};

start();
