/**
 * Handles the structural host and a mounted feature exchange.
 *
 * The keys are shared by id, so the compatibility shell and a feature mount
 * agree even when each bundle holds its own key object. The injector token
 * is how a lean mount reaches the table the host already created.
 */
import type { TableSource } from "@adapttable/core";
import { featureStateKey } from "@adapttable/core/binding";
import { InjectionToken, type Injector, type Signal } from "@angular/core";

import type { DataTable } from "../dataTable";
import type { AdaptTableFeature } from "../featureHost";

/**
 * Which optional controllers the compatibility shell already created.
 * A feature mount does nothing for a flag that is set.
 *
 * @public
 */
export interface SurfaceOccupation {
  /** The shell already owns cell navigation. */
  readonly grid: boolean;
  /** The shell already owns grouping. */
  readonly grouping: boolean;
  /** The shell already owns the editing bundle. */
  readonly editing: boolean;
}

/** Set by the compatibility shell before it mounts features. @public */
export const SURFACE_OCCUPIED =
  featureStateKey<SurfaceOccupation>("surface-occupied");

/** The grid controller a lean `cellNavigation()` mount publishes. @public */
export const SURFACE_GRID = featureStateKey<unknown>("surface-grid");

/** The grouping model a lean `grouping()` mount publishes. @public */
export const SURFACE_GROUPING = featureStateKey<unknown>("surface-grouping");

/** The editing bundle a lean `editing()` mount publishes. @public */
export const SURFACE_EDITING = featureStateKey<unknown>("surface-editing");

/**
 * The table a lean feature mount drives. The host provides it; the
 * compatibility shell does not.
 *
 * @public
 */
export interface SurfaceHandles<TRow> {
  /** The headless table. */
  readonly table: DataTable<TRow>;
  /** The source before grouping widens it. Grouping reads this. */
  readonly source: Signal<TableSource<TRow>>;
  /** The source the table reads, widened once grouping publishes a model. */
  readonly viewSource: Signal<TableSource<TRow>>;
  /** The features composed onto this table. */
  readonly features: readonly AdaptTableFeature[];
  /** The current grouping model, when the grouping mount has published one. */
  groupingModel(): unknown;
  /**
   * Install the source widen. Grouping owns the projector, so the host never
   * imports the grouping implementation.
   */
  installProjector(
    project: (source: TableSource<TRow>, model: unknown) => TableSource<TRow>
  ): void;
  /** Publish the grouping signal the widen and the body both read. */
  publishGrouping(grouping: Signal<unknown> | undefined): void;
  /**
   * Create this table's grouping state in `injector`, or `undefined` when its
   * features compose no grouping. The host owns the grouping implementation,
   * so a feature never imports it.
   */
  createGrouping(injector: Injector): Signal<unknown> | undefined;
}

/** Provided by {@link injectTableSurfaceHost} for the mounts it runs. @public */
export const SURFACE_HANDLES = new InjectionToken<SurfaceHandles<unknown>>(
  "adapttable.surface-handles"
);
