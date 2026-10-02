/**
 * Row-reorder Chrome: the grip, the mobile up/down pair, and the live
 * region — structure and wiring only. Every visible control is the kit's.
 */
import { resolveLabels } from "@adapttable/core";
import type {
  RowMoveMenuSlotProps,
  RowReorderButtonsProps as NeutralRowReorderButtonsProps,
  RowReorderHandleProps as NeutralRowReorderHandleProps,
  RowReorderHandleSlotProps as NeutralRowReorderHandleSlotProps,
  RowReorderLabels,
  RowReorderMoveButtonProps,
} from "@adapttable/core/binding";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type Type,
} from "@angular/core";

import { AdaptLiveRegion } from "../a11y/liveRegion";
import { AdaptControl } from "../control";
import type { RowReorderState } from "./rowReorder";

/**
 * Props for an adapter row-reorder grip — core's handle props over Angular's
 * reorder state.
 *
 * @public
 */
export type RowReorderHandleProps<TRow> = NeutralRowReorderHandleProps<
  TRow,
  RowReorderState<TRow>
>;

/**
 * Kit grip the reorder Chrome calls — core's handle slot props with DOM events.
 *
 * @public
 */
export type RowReorderHandleSlotProps = NeutralRowReorderHandleSlotProps<
  KeyboardEvent,
  DragEvent
>;

/**
 * Kit-supplied controls for {@link AdaptRowReorderHandleChrome}.
 *
 * @public
 */
export interface RowReorderHandleSlots {
  /** The drag grip. */
  readonly Handle: Type<unknown>;
  /** The destination menu and confirmation. */
  readonly Menu: Type<unknown>;
}

/**
 * Props for an adapter mobile reorder pair — core's buttons props over
 * Angular's reorder state.
 *
 * @public
 */
export type RowReorderButtonsProps<TRow> = NeutralRowReorderButtonsProps<
  TRow,
  RowReorderState<TRow>
>;

/**
 * Kit-supplied controls for {@link AdaptRowReorderButtonsChrome}.
 *
 * @public
 */
export interface RowReorderButtonsSlots {
  /** One move-up or move-down button. */
  readonly Button: Type<unknown>;
  /** The destination menu and confirmation. */
  readonly Menu: Type<unknown>;
}

export type {
  RowMoveConfirmationProps,
  RowMoveMenuItemProps,
  RowMoveMenuSlotProps,
  RowReorderMoveButtonProps,
} from "@adapttable/core/binding";

/**
 * The destination menu both reorder controls offer, and the state it needs.
 */
function moveMenuProps<TRow>(
  reorder: RowReorderState<TRow>,
  labels: RowReorderLabels,
  row: TRow,
  moveLocked: boolean
): RowMoveMenuSlotProps | undefined {
  const copy = resolveLabels(labels);
  const menu = reorder.moveMenu?.(row);
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

/**
 * Desktop grip: pointer drag plus Space-lift keyboard. Kits wrap this in
 * their own cell so the handle looks like the rest of the row.
 *
 * @public
 */
@Component({
  selector: "adapt-row-reorder-handle-chrome",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let handle = handleProps();
    <ng-container
      [adaptControl]="slots().Handle"
      [adaptControlProps]="handle"
    />
    @if (menu(); as menuProps) {
      <ng-container
        [adaptControl]="slots().Menu"
        [adaptControlProps]="menuProps"
      />
    }
  `,
})
export class AdaptRowReorderHandleChrome<TRow> {
  /** Live reorder state. */
  readonly reorder = input.required<RowReorderState<TRow>>();
  /** Resolved reorder labels. */
  readonly labels = input.required<RowReorderLabels>();
  /** Identity of the row this control moves. */
  readonly rowId = input.required<string>();
  /** The row's index within the rendered window. */
  readonly localIndex = input.required<number>();
  /** The row being rendered. */
  readonly row = input.required<TRow>();
  /** Index of the first rendered row. */
  readonly windowStart = input.required<number>();
  /** Rows in the rendered window. */
  readonly rowCount = input.required<number>();
  /** Optional class for the grip. */
  readonly className = input<string>();
  /** The kit's controls. */
  readonly slots = input.required<RowReorderHandleSlots>();

  protected readonly moveLocked = computed(() => {
    const state = this.reorder();
    return Boolean(state.hostConfirmPending || state.pendingMove);
  });

  protected readonly handleProps = computed((): RowReorderHandleSlotProps => {
    const reorder = this.reorder();
    const rowId = this.rowId();
    const localIndex = this.localIndex();
    const row = this.row();
    const windowStart = this.windowStart();
    const rowCount = this.rowCount();
    return {
      label: this.labels().reorderRow,
      pressed: reorder.isLifted(rowId),
      dragging: reorder.isLifted(rowId),
      disabled: this.moveLocked(),
      className: this.className(),
      dragProps: reorder.dragProps(rowId, localIndex),
      onKeyDown: (event) => {
        reorder.handleKeyDown(
          event,
          rowId,
          localIndex,
          row,
          windowStart,
          rowCount
        );
      },
    };
  });

  protected readonly menu = computed(() =>
    moveMenuProps(this.reorder(), this.labels(), this.row(), this.moveLocked())
  );
}

/**
 * Mobile up/down — a drag handle on a card is unusable. Each press swaps
 * with the neighbour; the ends disable rather than wrapping.
 *
 * @public
 */
@Component({
  selector: "adapt-row-reorder-buttons-chrome",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <span data-adapttable-part="row-reorder-buttons" [class]="className()">
      <ng-container
        [adaptControl]="slots().Button"
        [adaptControlProps]="upProps()"
      />
      <ng-container
        [adaptControl]="slots().Button"
        [adaptControlProps]="downProps()"
      />
      @if (menu(); as menuProps) {
        <ng-container
          [adaptControl]="slots().Menu"
          [adaptControlProps]="menuProps"
        />
      }
    </span>
  `,
})
export class AdaptRowReorderButtonsChrome<TRow> {
  /** Live reorder state. */
  readonly reorder = input.required<RowReorderState<TRow>>();
  /** Resolved reorder labels. */
  readonly labels = input.required<RowReorderLabels>();
  /** The row's index within the rendered window. */
  readonly localIndex = input.required<number>();
  /** The row being rendered. */
  readonly row = input.required<TRow>();
  /** Index of the first rendered row. */
  readonly windowStart = input.required<number>();
  /** Rows in the rendered window. */
  readonly rowCount = input.required<number>();
  /** Optional class for the pair. */
  readonly className = input<string>();
  /** Optional class for the up button. */
  readonly upClassName = input<string>();
  /** Optional class for the down button. */
  readonly downClassName = input<string>();
  /** The kit's controls. */
  readonly slots = input.required<RowReorderButtonsSlots>();

  protected readonly moveLocked = computed(() => {
    const state = this.reorder();
    return Boolean(state.hostConfirmPending || state.pendingMove);
  });

  protected readonly upProps = computed((): RowReorderMoveButtonProps => {
    const reorder = this.reorder();
    const localIndex = this.localIndex();
    const row = this.row();
    const windowStart = this.windowStart();
    const rowCount = this.rowCount();
    return {
      label: this.labels().moveRowUp,
      part: "row-reorder-up",
      disabled: this.moveLocked() || localIndex <= 0,
      className: this.upClassName(),
      onClick: () => {
        reorder.moveBy(localIndex, -1, row, windowStart, rowCount);
      },
    };
  });

  protected readonly downProps = computed((): RowReorderMoveButtonProps => {
    const reorder = this.reorder();
    const localIndex = this.localIndex();
    const row = this.row();
    const windowStart = this.windowStart();
    const rowCount = this.rowCount();
    return {
      label: this.labels().moveRowDown,
      part: "row-reorder-down",
      disabled: this.moveLocked() || localIndex >= rowCount - 1,
      className: this.downClassName(),
      onClick: () => {
        reorder.moveBy(localIndex, 1, row, windowStart, rowCount);
      },
    };
  });

  protected readonly menu = computed(() =>
    moveMenuProps(this.reorder(), this.labels(), this.row(), this.moveLocked())
  );
}

/**
 * The live region for row reorder. Kits render this only while reorder is composed.
 *
 * @public
 */
@Component({
  selector: "adapt-row-reorder-announcer",
  imports: [AdaptLiveRegion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <output
      [adaptLiveRegion]="props().announcement"
      part="row-reorder-announcer"
    ></output>
  `,
})
export class AdaptRowReorderAnnouncer {
  /** What to announce — the slot fill's single props bag. */
  readonly props = input.required<{ readonly announcement: string }>();
}
