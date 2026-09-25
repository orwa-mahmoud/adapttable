/**
 * The key the row-reorder feature publishes under.
 *
 * It lives apart from the feature so the table's chrome can ask for the state
 * without importing the implementation that produces it. That separation is
 * the whole point: a chrome that imported `useRowReorder` to read its result
 * would put the hook back in every table's graph, which is what the feature
 * exists to avoid.
 */
import type { RowReorderState } from "../rows/rowReorder";
import { featureStateKey } from "./providers";

/**
 * Row-reorder state, published by the `rowReorder()` feature.
 *
 * @public
 */
export const ROW_REORDER =
  featureStateKey<RowReorderState<unknown>>("row-reorder");
