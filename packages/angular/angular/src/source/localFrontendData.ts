/**
 * The frontend tier for Angular with its view state kept in memory: rows
 * searched, filtered, sorted and paged with no URL read or written.
 */
import type { TableSource } from "@adapttable/core";
import {
  assertInInjectionContext,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import { injectLocalTableViewState } from "../url/localTableViewState";
import { type FrontendDataOptions, frontendDataWith } from "./frontendData";

/**
 * Options for `injectLocalFrontendData`: those of `injectFrontendData`
 * without the URL options.
 *
 * @public
 */
export type LocalFrontendDataOptions<TRow> = Omit<
  FrontendDataOptions<TRow>,
  "urlAdapter" | "urlSync" | "urlKey"
>;

/**
 * An in-memory `TableSource`, as a signal, whose view state lives in the
 * table's store. It searches, filters, sorts and pages the rows it is given
 * exactly as `injectFrontendData`, and never reads or writes the URL.
 *
 * @param options - See {@link LocalFrontendDataOptions}.
 * @returns The source, recomputed whenever the rows or the view state move.
 *
 * @public
 */
export function injectLocalFrontendData<TRow>(
  options: LocalFrontendDataOptions<TRow>
): Signal<TableSource<TRow>> {
  if (!options.injector) assertInInjectionContext(injectLocalFrontendData);
  const injector = options.injector ?? inject(Injector);
  return frontendDataWith(
    options,
    injectLocalTableViewState({ ...options, injector }),
    injector
  );
}
