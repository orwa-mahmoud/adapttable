import type { MaybeRefOrGetter } from "vue";

import { requireScope } from "../store";
import { useLocalTableViewState } from "../url/useLocalTableViewState";
import {
  type FrontendDataState,
  type UseFrontendDataOptions,
  useFrontendDataWith,
} from "./useFrontendData";

/**
 * Options for `useLocalFrontendData`: those of `useFrontendData` without a
 * URL.
 *
 * @public
 */
export type UseLocalFrontendDataOptions<TRow> = Omit<
  UseFrontendDataOptions<TRow>,
  "urlAdapter" | "urlSync" | "urlKey"
>;

/**
 * Search, filter, sort and page through the neutral frontend engine with the
 * view state in memory. It is `useFrontendData` without URL sync, and a table
 * built on it carries no URL code.
 *
 * @param input - See `UseLocalFrontendDataOptions`.
 * @returns The table source state and its actions.
 * @public
 */
export function useLocalFrontendData<TRow>(
  input: MaybeRefOrGetter<UseLocalFrontendDataOptions<TRow>>
): FrontendDataState<TRow> {
  requireScope("useLocalFrontendData");
  return useFrontendDataWith(input, useLocalTableViewState);
}
