/**
 * The saved-views page, written once for React, Vue and Angular: where the
 * views live, the views a visitor finds already there (one shared and
 * read-only, one saved by an older table), and how the page says an old view
 * was upgraded. A framework adds its binding's views state, its kit's panel
 * and its table.
 */
import {
  createMemoryAdapter,
  type LayoutStorage,
  type SavedView,
  type SavedViewMigration,
  type UrlStateAdapter,
} from "@adapttable/core";

/** The key the views are stored under. */
export const SAVED_VIEWS_STORAGE_KEY = "showcase-views";

/** The URL namespace the views and the table share. */
export const SAVED_VIEWS_URL_KEY = "sv";

/**
 * A view this reader did not create, to show what a shared one looks like.
 * Its controls are disabled and it says why.
 */
const SHARED_VIEW: SavedView = {
  name: "Team: platform",
  search: "sv.q=Platform",
  visibility: "team",
  readOnly: true,
  version: 2,
};

/** Views saved by an older table, so the upgrade path is on screen too. */
const SEEDED_VIEWS = JSON.stringify([
  SHARED_VIEW,
  { name: "Legacy view", search: "sv.q=a" },
]);

/**
 * In-memory storage seeded for the page, so a visitor sees a populated list
 * and nothing they do outlives the page.
 *
 * @returns A fresh storage holding the seeded views.
 */
export function createSeededViewStorage(): LayoutStorage {
  const store = new Map<string, string>([
    [SAVED_VIEWS_STORAGE_KEY, SEEDED_VIEWS],
  ]);
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

/**
 * A migration that keeps each view as it was and reports it, so the page can
 * say which views were upgraded on load.
 *
 * @param report - Receives each upgraded view's caption, once.
 * @returns The migration the views state takes.
 */
export function reportingMigration(
  report: (caption: string) => void
): SavedViewMigration {
  return (view, from) => {
    report(`${view.name} (v${String(from)})`);
    return view;
  };
}

/** What the panel's footer says about the views upgraded on load. */
export function upgradedFooter(
  captions: readonly string[]
): string | undefined {
  return captions.length > 0
    ? `Upgraded on load: ${captions.join(", ")}`
    : undefined;
}

/**
 * The address the page's table and its views share: kept in memory, so only
 * the live demo writes the address bar.
 *
 * @returns A fresh in-memory URL adapter.
 */
export function createViewSession(): UrlStateAdapter {
  return createMemoryAdapter();
}
