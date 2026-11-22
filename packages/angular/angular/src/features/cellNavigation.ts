/**
 * Cell navigation as a composed feature — keyboard grid focus over the
 * table body.
 *
 * The headless hook stays {@link injectGridFocus}; this factory only turns
 * the capability on so a kit can list it with the other features.
 */
import {
  type AdaptTableFeature,
  injectGridFocus,
  SURFACE_GRID,
  SURFACE_HANDLES,
  SURFACE_OCCUPIED,
} from "@adapttable/angular";
import type { CellRange } from "@adapttable/core";
import { coreCellNavigation } from "@adapttable/core/binding";

/**
 * Options for {@link cellNavigation}.
 *
 * @public
 */
export interface CellNavigationOptions {
  /**
   * Called when the selected cell rectangle changes. `null` when the
   * selection clears.
   */
  readonly onRangeChange?: (range: CellRange | null) => void;
}

/**
 * A keyboard grid with a focused cell.
 *
 * ```ts
 * import { cellNavigation } from "@adapttable/angular-unstyled/cell-navigation";
 *
 * features: [cellNavigation()]
 * ```
 *
 * Prefer this over the table's `cellNavigation` input when composing with
 * other features; the input still works for hosts that toggle it alone.
 *
 * @param options - Optional range-change listener.
 * @returns The feature.
 *
 * @public
 */
export function cellNavigation(
  options: CellNavigationOptions = {}
): AdaptTableFeature {
  const feature: CellNavigationFeature = {
    ...coreCellNavigation(
      options.onRangeChange ? { onRangeChange: options.onRangeChange } : {}
    ),
    cellNavigationOptions: options,
    mount(context) {
      const occupied = context.state.get(SURFACE_OCCUPIED)();
      if (occupied?.grid) return;
      const handles = context.injector.get(SURFACE_HANDLES, null);
      if (!handles) return;
      const grid = injectGridFocus({
        table: handles.table,
        enabled: true,
        // Kept across re-declarations: the latest declaration's callback.
        onRangeChange: (range) => {
          cellNavigationOptionsOf(context.feature(), options).onRangeChange?.(
            range
          );
        },
        injector: context.injector,
      });
      context.state.set(SURFACE_GRID, grid);
      return () => {
        context.state.set(SURFACE_GRID, undefined);
      };
    },
  };
  return feature;
}

/** The declaration's options, so a kept grid reads the latest. */
interface CellNavigationFeature extends AdaptTableFeature {
  readonly cellNavigationOptions: CellNavigationOptions;
}

function cellNavigationOptionsOf(
  feature: object,
  fallback: CellNavigationOptions
): CellNavigationOptions {
  return "cellNavigationOptions" in feature
    ? (feature as CellNavigationFeature).cellNavigationOptions
    : fallback;
}
