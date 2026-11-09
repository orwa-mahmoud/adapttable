/**
 * The pivot panel's contract: the props its Chrome takes and the pieces a
 * kit fills it with.
 *
 * Every binding's pivot-panel Chrome lays out the same three zones, the same
 * keyboard-first field rows and the same add and aggregation controls; only
 * the components differ. Rendered content is the binding's `TNode`, so a
 * React kit and an Angular kit fill the same shapes with their own nodes.
 */

import type { AggregateName } from "../contracts/columns";
import type { TableLabels } from "../types";
import type { PivotField, PivotZone } from "./pivotConfigModel";
import type { PivotConfig } from "./pivotModel";

/**
 * Props an adapter's panel surface receives.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export interface PivotPanelSurfaceProps<TNode = unknown> {
  /** Content rendered inside. */
  readonly children: TNode;
  /** Class for the element. */
  readonly className?: string;
  /** Spread onto the surface — the public part name. */
  readonly "data-adapttable-part": "pivot-panel";
}

/**
 * Props an adapter's zone receives — one titled list.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export interface PivotZoneProps<TNode = unknown> {
  /** Which zone this is, for styling and testing. */
  readonly zone: PivotZone;
  /** The zone's caption, already localized. */
  readonly label: string;
  /** Its entries, and the control that adds to it. */
  readonly children: TNode;
  /** Spread onto the zone — the public part name. */
  readonly "data-adapttable-part": "pivot-zone";
}

/**
 * Props an adapter's field row receives.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export interface PivotFieldProps<TNode = unknown> {
  /** What to call the field. */
  readonly label: string;
  /** Move it one step towards the outside. `undefined` when it is first. */
  readonly onMoveUp?: () => void;
  /** Move it one step towards the inside. `undefined` when it is last. */
  readonly onMoveDown?: () => void;
  /** Take it off this zone. */
  readonly onRemove: () => void;
  /** Accessible names for the three controls. */
  readonly moveUpLabel: string;
  /** Accessible name for the move-down control. */
  readonly moveDownLabel: string;
  /** Accessible name for the remove control. */
  readonly removeLabel: string;
  /** The aggregation chooser, for a measure. Absent on a dimension. */
  readonly aggregation?: TNode;
  /** Spread onto the field row — the public part name. */
  readonly "data-adapttable-part": "pivot-field";
}

/**
 * Props an adapter's "add a field" control receives.
 *
 * @public
 */
export interface PivotAddProps {
  /** Accessible name. */
  readonly label: string;
  /** The fields that can still be added. Empty means nothing is left. */
  readonly options: readonly PivotField[];
  /** Add one. */
  readonly onAdd: (key: string) => void;
}

/**
 * Props an adapter's aggregation chooser receives.
 *
 * @public
 */
export interface PivotAggProps {
  /** Accessible name. */
  readonly label: string;
  /** The current aggregation. */
  readonly value: AggregateName;
  /** What it can be. */
  readonly options: readonly AggregateName[];
  /** Change it. */
  readonly onChange: (next: AggregateName) => void;
}

/**
 * The kit-native pieces the panel is built from.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export interface PivotPanelSlots<TNode = unknown> {
  /** The panel body. */
  readonly Surface: (props: PivotPanelSurfaceProps<TNode>) => TNode;
  /** One titled zone. */
  readonly Zone: (props: PivotZoneProps<TNode>) => TNode;
  /** One field in a zone. */
  readonly Field: (props: PivotFieldProps<TNode>) => TNode;
  /** The control that adds a field to a zone. */
  readonly Add: (props: PivotAddProps) => TNode;
  /** The aggregation chooser on a measure. */
  readonly Agg: (props: PivotAggProps) => TNode;
}

/**
 * What the panel needs to render.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export interface PivotPanelChromeProps<TNode = unknown> {
  /** Every field the user can pivot on. */
  fields: readonly PivotField[];
  /** The configuration being edited. */
  config: PivotConfig;
  /** Report a change. The panel never holds the configuration itself. */
  onChange: (next: PivotConfig) => void;
  /** Labels; falls back to the built-in English. */
  labels?: TableLabels;
  /** The kit's controls. */
  slots: PivotPanelSlots<TNode>;
  /** Class for the element. */
  className?: string;
}
