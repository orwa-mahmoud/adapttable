/**
 * Measuring a row that carries an expanded detail panel beneath it.
 *
 * A `<tr>` cannot contain its detail panel, so one virtual item is two
 * elements; measuring the row alone reports its height without the panel and
 * scroll positions drift. Both halves are observed and their combined height
 * is handed to the virtualizer through `resizeItem`.
 */
import {
  RowPairMeasureController,
  type RowPairMeasurer,
} from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  effect,
  inject,
  Injector,
  untracked,
} from "@angular/core";

import { type MaybeSignal, readMaybe } from "../store";

export type { RowPairMeasurer } from "@adapttable/core/binding";

/**
 * What a virtualizer must offer for a pair to be measurable.
 *
 * @public
 */
export interface ResizableVirtualizer {
  /** Tell the virtualizer an item's real size. */
  readonly resizeItem: (index: number, size: number) => void;
}

/**
 * Options for {@link injectRowPairMeasurer}.
 *
 * @public
 */
export interface RowPairMeasurerOptions {
  /** The virtualizer to report sizes to, read when a size arrives. */
  readonly virtualizer: () => ResizableVirtualizer | undefined;
  /** Off when nothing is virtualized or nothing can expand. */
  readonly enabled: MaybeSignal<boolean>;
  /** The injector whose lifetime the observer follows. */
  readonly injector?: Injector;
}

/**
 * Measure each row together with its open detail panel.
 *
 * @param options - See {@link RowPairMeasurerOptions}.
 * @returns Ref callbacks for a row and its detail; inert while disabled.
 *
 * @public
 */
export function injectRowPairMeasurer(
  options: RowPairMeasurerOptions
): RowPairMeasurer {
  if (!options.injector) assertInInjectionContext(injectRowPairMeasurer);
  const injector = options.injector ?? inject(Injector);
  const controller = new RowPairMeasureController((index, size) => {
    options.virtualizer()?.resizeItem(index, size);
  });
  effect(
    (onCleanup) => {
      if (!readMaybe(options.enabled)) return;
      onCleanup(controller.connect());
    },
    { injector }
  );
  const attach =
    (index: number, half: "row" | "detail") => (node: Element | null) => {
      if (untracked(() => readMaybe(options.enabled))) {
        controller.attach(index, half, node);
      }
    };
  return {
    row: (index) => attach(index, "row"),
    detail: (index) => attach(index, "detail"),
  };
}
