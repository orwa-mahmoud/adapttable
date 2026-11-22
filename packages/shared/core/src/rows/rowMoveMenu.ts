import type { TableRuntimeView } from "../features/tableRuntime";
import { ROW_LABELS } from "../labelGroups/rowLabels";
import { resolveFeatureLabels } from "../labelGroups/tableLabels";
import type {
  RowMoveMenuSlotProps,
  RowReorderState,
} from "./rowReorderContract";
import type { RowReorderLabels } from "./rowReorderEngine";

const ROW_GROUPS = [ROW_LABELS] as const;

/**
 * The part of a reorder state the destination menu reads.
 *
 * @public
 */
export type RowMoveMenuSource<TRow> = Pick<
  RowReorderState<TRow>,
  "pendingMove" | "selectMoveTarget" | "confirmMove" | "cancelMove"
> &
  Partial<Pick<RowReorderState<TRow>, "moveMenu" | "isMovePending">>;

/**
 * The destination menu a row's reorder control offers, with the confirmation
 * a pending move on this row waits for. Absent when the row has nowhere to
 * move.
 *
 * @param reorder - The table's reorder state.
 * @param labels - Label overrides.
 * @param row - The row the menu moves.
 * @param moveLocked - Whether moves are locked right now.
 *
 * @public
 */
export function rowMoveMenuProps<TRow>(
  reorder: RowMoveMenuSource<TRow>,
  labels: RowReorderLabels | undefined,
  row: TRow,
  moveLocked: boolean,
  view?: TableRuntimeView<TRow>
): RowMoveMenuSlotProps | undefined {
  const menu = reorder.moveMenu?.(row, view);
  if (!menu) return undefined;
  const ownsPending =
    reorder.isMovePending?.(row) ?? reorder.pendingMove?.row === row;
  const pending = ownsPending ? reorder.pendingMove : undefined;
  const from =
    pending?.kind === "group"
      ? pending.fromGroup.label
      : pending?.fromParent.label;
  const to =
    pending?.kind === "group" ? pending.toGroup.label : pending?.toParent.label;
  const copy = resolveFeatureLabels(labels, ROW_GROUPS);
  return {
    label: menu.label,
    items: menu.targets.map((target) => ({
      id: target.id,
      label: target.label,
      disabled: moveLocked || target.disabledReason !== undefined,
      disabledReason: target.disabledReason,
      onSelect: () => {
        reorder.selectMoveTarget(target);
      },
    })),
    confirmation:
      pending && from && to
        ? {
            title: copy.confirmRowMoveTitle,
            description: copy.confirmRowMoveDescription(
              pending.rowLabel,
              from,
              to
            ),
            confirmLabel: copy.confirmRowMove,
            cancelLabel: copy.cancel,
            onConfirm: reorder.confirmMove,
            onCancel: reorder.cancelMove,
          }
        : undefined,
  };
}
