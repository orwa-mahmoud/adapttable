import type { RowGroupRef } from "../grouping/groupRows";

/**
 * How cross-group moves and tree re-parenting are handled.
 *
 * @public
 */
export type RowMovePolicy = "auto" | "confirm" | "never";

/**
 * A tree parent address. `id` and `row` are `null` for the root level.
 *
 * @public
 */
export interface RowTreeParentRef<TRow> {
  /** Stable parent id, or `null` for the root level. */
  readonly id: string | null;
  /** Parent row, or `null` for the root level. */
  readonly row: TRow | null;
  /** Human-readable parent name. */
  readonly label: string;
}

/**
 * A cross-group or tree re-parent request.
 *
 * @public
 */
export type RowMoveRequest<TRow> =
  | {
      readonly kind: "group";
      readonly row: TRow;
      readonly rowLabel: string;
      readonly fromGroup: RowGroupRef;
      readonly toGroup: RowGroupRef;
      /** Zero-based position among rows in the destination group. */
      readonly position: number;
    }
  | {
      readonly kind: "tree";
      readonly row: TRow;
      readonly rowLabel: string;
      readonly fromParent: RowTreeParentRef<TRow>;
      readonly toParent: RowTreeParentRef<TRow>;
      /** Zero-based position among children of the destination parent. */
      readonly position: number;
    };

/**
 * Host write for a row crossing group boundaries.
 *
 * @public
 */
export type RowGroupMoveHandler<TRow> = (
  row: TRow,
  fromGroup: RowGroupRef,
  toGroup: RowGroupRef,
  position: number
) => unknown;

/**
 * Host write for a row changing tree parent.
 *
 * @public
 */
export type RowTreeMoveHandler<TRow> = (
  row: TRow,
  fromParent: RowTreeParentRef<TRow>,
  toParent: RowTreeParentRef<TRow>,
  position: number
) => unknown;

/**
 * External confirmation path for hosts that own their own dialog.
 *
 * @public
 */
export type RowMoveConfirmHandler<TRow> = (
  request: RowMoveRequest<TRow>
) => Promise<boolean>;

/**
 * Nested-move configuration passed as the row-reorder factory's second
 * argument.
 *
 * @public
 */
export interface RowReorderOptions<TRow> {
  /**
   * Cross-boundary policy. Defaults to `"never"`; same-scope reorder remains
   * available under every policy.
   */
  readonly movePolicy?: RowMovePolicy;
  /** Writes a row into another group. */
  readonly onGroupMove?: RowGroupMoveHandler<TRow>;
  /** Writes a row under another tree parent. */
  readonly onTreeMove?: RowTreeMoveHandler<TRow>;
  /**
   * Host-owned confirmation. Without it, `"confirm"` uses the kit menu's
   * confirmation surface.
   */
  readonly confirmMove?: RowMoveConfirmHandler<TRow>;
}

/**
 * Pointer drop edge or tree nesting target.
 *
 * @public
 */
export type RowDropPosition = "before" | "inside" | "after";

/**
 * One keyboard/touch destination in the row-move menu.
 *
 * @public
 */
export interface RowMoveTarget<TRow> {
  /** Stable option id. */
  readonly id: string;
  /** Human-readable destination. */
  readonly label: string;
  /** Move performed when selected. */
  readonly request?: RowMoveRequest<TRow>;
  /** Why this destination cannot be selected. */
  readonly disabledReason?: string;
}

/**
 * Shape-specific row-move menu.
 *
 * @public
 */
export interface RowMoveMenuModel<TRow> {
  /** Group picker or tree-parent picker. */
  readonly kind: "group" | "tree";
  /** Accessible trigger label. */
  readonly label: string;
  /** Available and explicitly rejected destinations. */
  readonly targets: readonly RowMoveTarget<TRow>[];
}

/**
 * Split a tree row into before / inside / after drop zones.
 *
 * @public
 */
export function rowDropPosition(
  clientY: number,
  bounds: Pick<DOMRect, "top" | "height">
): RowDropPosition {
  if (!Number.isFinite(clientY) || bounds.height <= 0) return "after";
  const offset = clientY - bounds.top;
  if (offset < bounds.height * 0.25) return "before";
  if (offset > bounds.height * 0.75) return "after";
  return "inside";
}

/**
 * Whether a tree re-parent would put a node inside itself or a descendant.
 *
 * @public
 */
export function treeMoveCreatesCycle(
  rowId: string,
  descendantIds: readonly string[],
  targetParentId: string | null
): boolean {
  return (
    targetParentId === rowId ||
    (targetParentId !== null && descendantIds.includes(targetParentId))
  );
}
