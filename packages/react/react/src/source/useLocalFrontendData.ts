import type { TableSource } from "@adapttable/core";

import { useLocalTableViewState } from "../url/useLocalTableViewState";
import {
  type UseFrontendDataOptions,
  useFrontendDataWith,
} from "./useFrontendData";

/**
 * Options for {@link useLocalFrontendData}: those of `useFrontendData`
 * without a URL.
 *
 * @public
 */
export type UseLocalFrontendDataOptions<TRow> = Omit<
  UseFrontendDataOptions<TRow>,
  "urlAdapter" | "urlSync" | "urlKey"
>;

/**
 * In-memory `TableSource` whose page, sort, search and filters live in the
 * table alone. It is `useFrontendData` without URL sync, and a table built on
 * it carries no URL code; `useFrontendData` is the same table with a
 * shareable URL.
 *
 * @typeParam TRow - The row item type.
 * @param options - See {@link UseLocalFrontendDataOptions}.
 * @returns A `TableSource` over the in-memory data.
 *
 * @public
 */
export function useLocalFrontendData<TRow>(
  options: UseLocalFrontendDataOptions<TRow>
): TableSource<TRow> {
  // A pass-through: the compiler's cache would outweigh the call it saves.
  "use no memo";
  return useFrontendDataWith(options, useLocalTableViewState);
}
