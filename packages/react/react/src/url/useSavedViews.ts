/**
 * Saved views — the React binding.
 *
 * The list, its persistence and every operation on it live in core's
 * saved-views controller. This hook resolves the storage backend, subscribes
 * to the controller, and connects it after mount — so the list hydrates in an
 * effect and the server's first render matches the client's.
 */
import { type SavedViewsControllerOptions } from "@adapttable/core";
import {
  createSavedViewsController,
  safeLocalStorage,
  type UseSavedViewsResult,
} from "@adapttable/core/binding";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { LayoutStorage } from "../columns/useColumnLayoutStorageState";
export {
  SAVED_VIEW_VERSION,
  type SavedView,
  type SavedViewMigration,
  type SavedViewsStore,
  type SavedViewVisibility,
} from "@adapttable/core";
export type { UseSavedViewsResult } from "@adapttable/core/binding";

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
