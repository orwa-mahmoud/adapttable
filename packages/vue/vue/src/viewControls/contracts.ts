/** Lightweight state and required control channels; no feature is installed here. */
import type { Direction, TableDensity, TableLabels } from "@adapttable/core";
import {
  featureSlotKey,
  featureStateKey,
  type FullscreenState,
} from "@adapttable/core/binding";
import type { UseSavedViewsResult } from "@adapttable/vue";
import type {
  DensityControlProps as CanonicalDensityControlProps,
  FullscreenControlProps as CanonicalFullscreenControlProps,
  SavedViewsControlProps as CanonicalSavedViewsControlProps,
} from "@adapttable/vue/adapter";

export interface ViewControlPresentation {
  readonly labels: Required<TableLabels>;
  readonly dir: Direction;
  readonly classNames?: Readonly<Record<string, string | undefined>>;
  readonly container?: HTMLElement;
}
export interface DensityControlProps extends ViewControlPresentation {
  readonly density: TableDensity;
  readonly onDensityChange: (next: TableDensity) => void;
}
export interface FullscreenControlProps extends ViewControlPresentation {
  readonly fullscreen: FullscreenState;
}
export interface SavedViewsControlProps extends ViewControlPresentation {
  readonly savedViews: UseSavedViewsResult;
}
export const DENSITY_CONTROL = featureSlotKey<CanonicalDensityControlProps>(
  "vue-density-control"
);
export const FULLSCREEN_CONTROL =
  featureSlotKey<CanonicalFullscreenControlProps>("vue-fullscreen-control");
export const SAVED_VIEWS_CONTROL =
  featureSlotKey<CanonicalSavedViewsControlProps>("vue-saved-views-control");
export const FULLSCREEN_MODEL = featureStateKey<FullscreenState>(
  "vue-fullscreen-model"
);
export const SAVED_VIEWS_MODEL = featureStateKey<UseSavedViewsResult>(
  "vue-saved-views-model"
);
