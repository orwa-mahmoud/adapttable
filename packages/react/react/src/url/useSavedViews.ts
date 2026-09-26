/**
 * Saved views — the React binding.
 *
 * The list, its persistence and every operation on it live in core's
 * saved-views controller. This hook resolves the storage backend, subscribes
 * to the controller, and connects it after mount — so the list hydrates in an
 * effect and the server's first render matches the client's.
 */
import {
  createSavedViewsController,
  safeLocalStorage,
  type SavedView,
  type SavedViewsControllerOptions,
} from "@adapttable/core";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { LayoutStorage } from "../columns/useColumnLayoutStorageState";

export {
  SAVED_VIEW_VERSION,
  type SavedView,
  type SavedViewMigration,
  type SavedViewsStore,
  type SavedViewVisibility,
} from "@adapttable/core";

/**
 * Options for `useSavedViews`.
 *
 * @public
 */
export interface UseSavedViewsOptions extends Omit<
  SavedViewsControllerOptions,
  "storage"
> {
  /** Storage backend. Defaults to `localStorage`; memory-only under SSR. */
  storage?: LayoutStorage;
}

/**
 * Result of `useSavedViews`.
 *
 * @public
 */
export interface UseSavedViewsResult {
  /** The saved views, in save order. */
  views: readonly SavedView[];
  /** Capture the table's CURRENT state under a name (replaces same-name). */
  save: (name: string) => void;
  /** Apply a saved view to the table (other tables' params untouched). */
  apply: (name: string) => void;
  /** Remove a saved view. */
  remove: (name: string) => void;
  /**
   * Rename a view, keeping its place in the list. A no-op when the name is
   * unknown or the new name is taken — silently merging two views is how a
   * rename loses one.
   */
  rename: (from: string, to: string) => void;
  /**
   * Move a view one step through the list. Past either end does nothing
   * rather than wrapping, and a view this reader may not change does not move
   * at all. With a `store`, the new order reaches it through
   * {@link SavedViewsStore.reorder}; a store without that member reorders for
   * the session only.
   */
  move: (name: string, delta: -1 | 1) => void;
  /**
   * Make a view the default, or clear the default by passing its own name
   * again. Only one view can hold it.
   */
  setDefault: (name: string) => void;
  /** The default view, when one is set. */
  defaultView: SavedView | undefined;
  /**
   * Read the list again — after someone else has changed a shared view, say.
   * Loading happens on mount and when `storageKey` changes; a `store` or a
   * `migrate` written inline changes identity on every render, so neither can
   * be allowed to trigger it. Refreshing is therefore something the host asks
   * for rather than something identity accidentally causes.
   */
  reload: () => void;
}

/**
 * Headless saved views: capture the table's current URL state (search,
 * sort, page, filters, column layout — ONLY this table's params) under a
 * name, persist the list, and re-apply on demand without touching other
 * tables sharing the URL. Wire it to any menu in the `toolbar` slot.
 *
 * @public
 */
export function useSavedViews(
  options: UseSavedViewsOptions
): UseSavedViewsResult {
  const { storage, storageKey } = options;
  // No backend at all — SSR, blocked storage — keeps the list in memory.
  const backend = useMemo<LayoutStorage | null>(
    () => storage ?? safeLocalStorage() ?? null,
    [storage]
  );
  const controllerOptions: SavedViewsControllerOptions = {
    ...options,
    storage: backend,
  };
  const [controller] = useState(() =>
    createSavedViewsController(controllerOptions)
  );
  controller.configure(controllerOptions);
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );

  // Loads on mount and when the key changes. The store and the migration are
  // read from the configuration rather than depended on: both are routinely
  // written inline, and an effect keyed on their identity would reload every
  // render.
  useEffect(() => controller.connect(), [controller, storageKey]);

  return useMemo(
    () => ({
      views: snapshot.views,
      save: controller.save,
      apply: controller.apply,
      remove: controller.remove,
      rename: controller.rename,
      move: controller.move,
      setDefault: controller.setDefault,
      defaultView: snapshot.defaultView,
      reload: controller.reload,
    }),
    [controller, snapshot]
  );
}
