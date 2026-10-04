/** Same-document demo transitions. Table query changes stay with the binding. */
export const DEMO_OPTION_KEYS = Object.freeze([
  "kit",
  "mode",
  "locale",
  "dir",
  "density",
  "filters",
  "grouping",
  "editing",
  "editing-mode",
  "structure",
  "dataset",
  "pagination",
  "failure",
  "filter-set",
  "columns",
  "navigation",
  "export",
  "views",
  "selection",
  "search",
  "summary",
  "row-pinning",
  "column-groups",
  "formula",
  "sparkline",
  "editors",
  "status-bar",
  "undo-redo",
  "side-panel",
  "context-menu",
  "palette",
  "print",
  "column-selection",
  "chrome",
  "highlight",
  "cell-flash",
  "row-mutations",
  "row-reorder",
  "pinned-summary",
  "cell-span",
  "extra-rows",
  "row-style",
  "virtualize",
  "mobile",
  "motion",
  "recipe",
  "tree",
  "panel",
  "options",
]);

/** @param {string} href */
export function demoOptionSignature(href) {
  const url = new URL(href, "https://adapttable.local");
  return JSON.stringify([
    url.pathname,
    ...DEMO_OPTION_KEYS.map((key) => [key, url.searchParams.get(key)]),
  ]);
}

/** Store host-owned data separately from replaceable Angular kit providers. */
export function createDemoSession() {
  /** @type {Map<string, unknown>} */
  const values = new Map();
  return {
    /** @template T @param {string} key @param {() => T} initialize @returns {T} */
    read(key, initialize) {
      if (!values.has(key)) values.set(key, initialize());
      return /** @type {T} */ (values.get(key));
    },
    /** @template T @param {string} key @param {T} value */
    write(key, value) {
      values.set(key, value);
    },
  };
}

/** Serialize provider teardown/bootstrap, dropping stale asynchronous kit loads.
 * @param {(isCurrent: () => boolean) => Promise<void>} render
 */
export function createLatestDemoTask(render) {
  let revision = 0;
  /** @type {Promise<void> | undefined} */
  let active;
  return () => {
    revision += 1;
    if (active) return active;
    active = (async () => {
      try {
        let rendered;
        do {
          rendered = revision;
          const ticket = rendered;
          await render(() => ticket === revision);
        } while (rendered !== revision);
      } finally {
        active = undefined;
      }
    })();
    return active;
  };
}

export const demoSession = createDemoSession();
/** @type {(() => void) | undefined} */
let capture;
/** @type {(() => Promise<void>) | undefined} */
let render;

/** @param {() => void} next */
export function registerDemoCapture(next) {
  capture = next;
  return () => {
    if (capture === next) capture = undefined;
  };
}
export function captureDemoState() {
  capture?.();
}
/** @param {() => Promise<void>} next */
export function registerDemoRenderer(next) {
  render = next;
}
/** Recreate only the Angular app, preserving this document and host rows.
 * The action (for example changing a saved view) runs only after draft safety.
 * @param {() => void} [action]
 */
export function refreshDemo(action) {
  if (!render)
    throw new Error("The Angular demo transition renderer is not ready");
  if (!canReplaceDemo()) return false;
  captureDemoState();
  if (action) action();
  void render();
  return true;
}
/** @param {URL} url @param {{replace?: boolean}} [options] */
export function navigateDemo(url, { replace = false } = {}) {
  if (url.origin !== window.location.origin)
    throw new Error("Demo transitions must stay on this origin");
  return refreshDemo(() => {
    if (url.href !== window.location.href) {
      if (!historyController)
        throw new Error("Demo history is not initialized");
      historyController.navigate(url, replace);
    }
  });
}

/** Clean batch fields stay visible; only active editors and pending writes block replacement. */
export const PENDING_EDIT_SELECTOR = [
  '[data-adapttable-part="edit-cell-editor"]:not([data-adapttable-part="batch-edit-cell"] *)',
  '[data-adapttable-part="batch-edit-cell"][data-changed]',
  ...[
    "row-edit-save",
    "row-edit-cancel",
    "batch-edit-save",
    "batch-edit-cancel",
    "batch-edit-bar",
  ].map((part) => `[data-adapttable-part="${part}"]`),
].join(",");

/** @param {{querySelector(selector: string): unknown}} root */
export function hasPendingDemoEdits(root) {
  return root.querySelector(PENDING_EDIT_SELECTOR) !== null;
}

const HISTORY_INDEX = "adapttableDemoIndex";
/** Indexed history is a normal binding URL adapter, not a global History patch.
 * @param {{href: () => string, state: () => unknown, push: (state: unknown, href: string) => void, replace: (state: unknown, href: string) => void, go: (delta: number) => void}} environment
 */
export function createDemoHistory(environment) {
  const readIndex = () => {
    const state = environment.state();
    return state &&
      typeof state === "object" &&
      HISTORY_INDEX in state &&
      typeof state[HISTORY_INDEX] === "number"
      ? state[HISTORY_INDEX]
      : undefined;
  };
  /** @param {number} index */
  const stateAt = (index) => {
    const state = environment.state();
    return {
      ...(state && typeof state === "object" ? state : {}),
      [HISTORY_INDEX]: index,
    };
  };
  let accepted = { href: environment.href(), index: readIndex() ?? 0 };
  environment.replace(stateAt(accepted.index), accepted.href);
  /** @type {{href: string, index: number} | undefined} */
  let origin;
  /** @type {{href: string, index: number} | undefined} */
  let restoring;
  /** @type {Set<() => void>} */
  const listeners = new Set();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  const snapshot = () => ({
    href: environment.href(),
    index: readIndex() ?? accepted.index,
  });
  /** @param {string} href @param {boolean} push @param {boolean} [host] */
  const write = (href, push, host = false) => {
    const previous = snapshot();
    if (host && !origin) origin = previous;
    const index = previous.index + (push ? 1 : 0);
    environment[push ? "push" : "replace"](stateAt(index), href);
    if (!origin) accepted = { href, index };
    if (!host) notify();
  };
  const reject = () => {
    const target = origin ?? accepted;
    origin = undefined;
    const index = readIndex();
    if (index !== undefined && index !== target.index) {
      restoring = target;
      environment.go(target.index - index);
    } else {
      environment.replace(stateAt(target.index), target.href);
      accepted = target;
    }
  };
  return {
    adapter: {
      getSearch: () => new URL(environment.href()).search.replace(/^\?/, ""),
      /** @param {string} search @param {{push?: boolean}} [options] */
      setSearch(search, options) {
        const url = new URL(environment.href());
        url.search = search;
        write(url.href, options?.push === true);
      },
      /** @param {() => void} listener */
      subscribe(listener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
    /** @param {URL} url @param {boolean} [replace] */
    navigate(url, replace = false) {
      write(url.href, !replace, true);
    },
    /** Host UI metadata changed without replacing providers. @param {URL} url */
    replace(url) {
      const index = readIndex() ?? accepted.index;
      environment.replace(stateAt(index), url.href);
      if (!origin) accepted = { href: url.href, index };
    },
    commit() {
      origin = undefined;
      accepted = snapshot();
    },
    reject,
    /** A blocked traverse is reversed, so no history entry is overwritten.
     * @param {boolean} pendingEdits
     */
    pop(pendingEdits) {
      if (restoring) {
        const target = restoring;
        const index = readIndex();
        if (index === undefined) {
          environment.replace(stateAt(target.index), target.href);
        } else if (index !== target.index) {
          environment.go(target.index - index);
          return false;
        }
        restoring = undefined;
        accepted = target;
        return false;
      }
      if (pendingEdits) {
        reject();
        return false;
      }
      origin = undefined;
      accepted = snapshot();
      notify();
      return true;
    },
  };
}

/** @type {ReturnType<typeof createDemoHistory> | undefined} */
let historyController;
/** @type {(() => void) | undefined} */
let restoreControls;
/** @param {() => void} callback */
export function registerDemoControlRestore(callback) {
  restoreControls = callback;
  return () => {
    if (restoreControls === callback) restoreControls = undefined;
  };
}

export function initializeDemoHistory() {
  historyController = createDemoHistory({
    href: () => window.location.href,
    state: () => {
      /** @type {unknown} */
      const state = window.history.state;
      return state;
    },
    push: (state, href) => window.history.pushState(state, "", href),
    replace: (state, href) => window.history.replaceState(state, "", href),
    go: (delta) => window.history.go(delta),
  });
  return historyController;
}
export const demoUrlAdapter = {
  getSearch: () => {
    if (!historyController) throw new Error("Demo history is not initialized");
    return historyController.adapter.getSearch();
  },
  /** @param {string} search @param {{push?: boolean}} [options] */
  setSearch: (search, options) => {
    if (!historyController) throw new Error("Demo history is not initialized");
    historyController.adapter.setSearch(search, options);
  },
  /** @param {() => void} listener */
  subscribe: (listener) => {
    if (!historyController) throw new Error("Demo history is not initialized");
    return historyController.adapter.subscribe(listener);
  },
};
/** @param {URL} url */
export function replaceDemoUrl(url) {
  if (!historyController) throw new Error("Demo history is not initialized");
  historyController.replace(url);
}

/** Leave drafts intact and make the required next step explicit. */
export function showDemoEditWarning() {
  const root = document.getElementById("root");
  if (!root) return;
  root.querySelector("[data-demo-edit-warning]")?.remove();
  const notice = document.createElement("dialog");
  notice.dataset.demoEditWarning = "";
  notice.className = "angular-transition-warning";
  notice.setAttribute("role", "alertdialog");
  notice.setAttribute("aria-label", "Finish editing before switching");
  const message = document.createElement("p");
  message.textContent =
    "Finish editing first. Save or cancel the active cell, row, or batch edit before changing the table. Your draft has been kept.";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Return to editing";
  button.addEventListener("click", () => {
    const dialog = /** @type {HTMLDialogElement | null} */ (
      root.querySelector("dialog.angular-lab-options")
    );
    dialog?.close();
    const url = new URL(window.location.href);
    url.searchParams.delete("options");
    replaceDemoUrl(url);
    notice.close();
    notice.remove();
    const editor = /** @type {HTMLElement | null} */ (
      root.querySelector(PENDING_EDIT_SELECTOR)
    );
    editor?.scrollIntoView({ block: "center" });
    editor?.focus();
  });
  notice.append(message, button);
  root.prepend(notice);
  restoreControls?.();
  notice.showModal();
}
export function canReplaceDemo() {
  const root = document.getElementById("root");
  if (!root || !hasPendingDemoEdits(root)) return true;
  historyController?.reject();
  showDemoEditWarning();
  return false;
}
