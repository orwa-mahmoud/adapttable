import type {
  DirtyEdits,
  useGroupCollapseUrlState,
  UseGroupCollapseUrlStateOptions,
  UseGroupCollapseUrlStateResult,
  useRowPinningUrlState,
  UseRowPinningUrlStateOptions,
  UseRowPinningUrlStateResult,
} from "@adapttable/vue";
import type { DirtyEdits as AdapterDirtyEdits } from "@adapttable/vue/adapter";
import type {
  DirtyEdits as BatchDirtyEdits,
  FeatureMountContext as BatchMountContext,
  TableFeatureHost as BatchHost,
} from "@adapttable/vue/batch-editing";
import type {
  FeatureMountContext as DensityMountContext,
  StaticFeatureHost as DensityStaticHost,
  UseSavedViewsResult as DensityViews,
} from "@adapttable/vue/density";
import type {
  CellContext,
  FeatureMountContext as EditingMountContext,
  FooterContext,
  HeaderContext,
  Renderer,
  StaticFeatureHost as EditingStaticHost,
  TableFeatureHost as EditingHost,
} from "@adapttable/vue/editing";
import type { DirtyEdits as FeatureDirtyEdits } from "@adapttable/vue/features";
import type {
  FeatureMountContext as FilterMountContext,
  StaticFeatureHost as FilterStaticHost,
  TableFeatureHost as FilterHost,
} from "@adapttable/vue/filters";
import type {
  FeatureMountContext as FullscreenMountContext,
  StaticFeatureHost as FullscreenStaticHost,
  UseSavedViewsResult as FullscreenViews,
} from "@adapttable/vue/fullscreen";
import type {
  FeatureMountContext as HeaderMountContext,
  StaticFeatureHost as HeaderStaticHost,
} from "@adapttable/vue/header-filters";
import type {
  FeatureMountContext as SavedViewsMountContext,
  StaticFeatureHost as SavedViewsStaticHost,
} from "@adapttable/vue/saved-views";
interface Row {
  readonly id: string;
}
export type SubpathMembers = [
  typeof useGroupCollapseUrlState,
  UseGroupCollapseUrlStateOptions,
  UseGroupCollapseUrlStateResult,
  typeof useRowPinningUrlState,
  UseRowPinningUrlStateOptions,
  UseRowPinningUrlStateResult,
  DirtyEdits,
  AdapterDirtyEdits,
  FeatureDirtyEdits,
  FilterMountContext<Row>,
  FilterStaticHost,
  FilterHost<Row>,
  HeaderMountContext<Row>,
  HeaderStaticHost,
  CellContext<Row>,
  EditingMountContext<Row>,
  FooterContext<Row>,
  HeaderContext<Row>,
  Renderer<CellContext<Row>>,
  EditingStaticHost,
  EditingHost<Row>,
  BatchDirtyEdits,
  BatchMountContext<Row>,
  BatchHost<Row>,
  DensityMountContext<Row>,
  DensityStaticHost,
  DensityViews,
  FullscreenMountContext<Row>,
  FullscreenStaticHost,
  FullscreenViews,
  SavedViewsMountContext<Row>,
  SavedViewsStaticHost,
];
