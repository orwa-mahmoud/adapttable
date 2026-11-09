/**
 * The row-reorder controls' contract: the props a kit's grip and mobile
 * buttons take, and the controls a kit fills the reorder Chrome with.
 *
 * Every binding's reorder Chrome lays out the same grip, the same pair of
 * up/down buttons and the same destination menu; only the components differ.
 * Rendered content is the binding's `TNode`, key events its `TKeyboardEvent`
 * and drag events its `TDragEvent`, and the reorder state is the binding's
 * own `TReorder`, so a React kit and an Angular kit fill the same shapes with
 * their own types.
 */
import { featureStateKey } from "../features/featureKeys";
import type {
  RowDropPosition,
  RowMoveMenuModel,
  RowMoveRequest,
  RowMoveTarget,
} from "./rowMove";
import type { RowReorderLabels } from "./rowReorderEngine";

/**
 * Props for a kit's `RowReorderHandle` — no slots on the public API.
 *
 * @typeParam TRow - The row type.
 * @typeParam TReorder - The binding's row-reorder state.
 *
 * @public
 */
export interface RowReorderHandleProps<TRow, TReorder = unknown> {
  /** Row-reorder state: what is being dragged and where it may land. */
  reorder: TReorder;
  /** Resolved labels, every key filled. */
  labels: RowReorderLabels;
  /** Identity of the row this control moves. */
  rowId: string;
  /** The row's index within the rendered window. */
  localIndex: number;
  /** The row being rendered. */
  row: TRow;
  /** Index of the first rendered row, so a windowed index maps back. */
  windowStart: number;
  /** Rows in the whole dataset, for the move bounds. */
  rowCount: number;
  /** Class for the element. */
  className?: string;
}

/**
 * Kit grip the reorder chrome calls.
 *
 * @typeParam TKeyboardEvent - The binding's key event (React's synthetic
 *   event in React, the DOM event elsewhere).
 * @typeParam TDragEvent - The binding's drag event.
 *
 * @public
 */
export interface RowReorderHandleSlotProps<
  TKeyboardEvent = KeyboardEvent,
  TDragEvent = DragEvent,
> {
  /** Accessible name for the control. */
  readonly label: string;
  /** Whether the grip is held. */
  readonly pressed: boolean;
  /** Whether a drag is in progress. */
  readonly dragging: boolean;
  /** Whether another move already owns confirmation. */
  readonly disabled: boolean;
  /** Class for the element. */
  readonly className?: string;
  /** Pointer bindings that start and track the drag. */
  readonly dragProps: {
    draggable: true;
    onDragStart: (event: TDragEvent) => void;
    onDragEnd: () => void;
  };
  /** Handles the keyboard move keys. */
  readonly onKeyDown: (event: TKeyboardEvent) => void;
}

/**
 * One option in the adapter-owned row destination menu.
 *
 * @public
 */
export interface RowMoveMenuItemProps {
  /** Stable destination id. */
  readonly id: string;
  /** Human-readable destination. */
  readonly label: string;
  /** Whether the destination is unavailable. */
  readonly disabled: boolean;
  /** Explanation exposed for an unavailable destination. */
  readonly disabledReason?: string;
  /** Selects this destination. */
  readonly onSelect: () => void;
}

/**
 * Pending move shown inside the adapter-owned menu surface.
 *
 * @public
 */
export interface RowMoveConfirmationProps {
  /** Confirmation heading. */
  readonly title: string;
  /** Concrete source-to-destination change. */
  readonly description: string;
  /** Approval button label. */
  readonly confirmLabel: string;
  /** Cancellation button label. */
  readonly cancelLabel: string;
  /** Commits the pending move. */
  readonly onConfirm: () => void;
  /** Discards the pending move. */
  readonly onCancel: () => void;
}

/**
 * Props for an adapter-owned nested row destination menu.
 *
 * @public
 */
export interface RowMoveMenuSlotProps {
  /** Accessible menu trigger and content label. */
  readonly label: string;
  /** Loaded move destinations. */
  readonly items: readonly RowMoveMenuItemProps[];
  /** Pending move to approve, when confirm policy is active. */
  readonly confirmation?: RowMoveConfirmationProps;
}

/**
 * Kit-supplied controls for the reorder grip's Chrome.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 * @typeParam TKeyboardEvent - The binding's key event.
 * @typeParam TDragEvent - The binding's drag event.
 *
 * @public
 */
export interface RowReorderHandleSlots<
  TNode = unknown,
  TKeyboardEvent = KeyboardEvent,
  TDragEvent = DragEvent,
> {
  /** Renders the drag grip. */
  readonly Handle: (
    props: RowReorderHandleSlotProps<TKeyboardEvent, TDragEvent>
  ) => TNode;
  /** Renders the nested-row destination menu and confirmation. */
  readonly Menu: (props: RowMoveMenuSlotProps) => TNode;
}

/**
 * Props for a kit's `RowReorderButtons` — no slots on the public API.
 *
 * @typeParam TRow - The row type.
 * @typeParam TReorder - The binding's row-reorder state.
 *
 * @public
 */
export interface RowReorderButtonsProps<TRow, TReorder = unknown> {
  /** Row-reorder state: what is being dragged and where it may land. */
  reorder: TReorder;
  /** Resolved labels, every key filled. */
  labels: RowReorderLabels;
  /** The row's index within the rendered window. */
  localIndex: number;
  /** The row being rendered. */
  row: TRow;
  /** Index of the first rendered row, so a windowed index maps back. */
  windowStart: number;
  /** Rows in the whole dataset, for the move bounds. */
  rowCount: number;
  /** Class for the element. */
  className?: string;
  /** Class for the move-up button. */
  upClassName?: string;
  /** Class for the move-down button. */
  downClassName?: string;
}

/**
 * Kit button the mobile reorder chrome calls.
 *
 * @public
 */
export interface RowReorderMoveButtonProps {
  /** Accessible name for the control. */
  readonly label: string;
  /** Part name, so styling can target this element. */
  readonly part: string;
  /** Whether the control is offered but not available. */
  readonly disabled: boolean;
  /** Class for the element. */
  readonly className?: string;
  /** Called when pressed. */
  readonly onClick: () => void;
}

/**
 * Kit-supplied controls for the mobile reorder buttons' Chrome.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export interface RowReorderButtonsSlots<TNode = unknown> {
  /** Renders one move button. */
  readonly Button: (props: RowReorderMoveButtonProps) => TNode;
  /** Renders the nested-row destination menu and confirmation. */
  readonly Menu: (props: RowMoveMenuSlotProps) => TNode;
}

/**
 * Headless reorder state returned by `useRowReorder`.
 *
 * @typeParam TDragEvent - The binding's drag event (React's `DragEvent`).
 * @typeParam TKeyEvent - The binding's key event (React's `KeyboardEvent`).
 *
 * @public
 */
export interface RowReorderState<
  TRow,
  TDragEvent = unknown,
  TKeyEvent = unknown,
> {
  /** The lifted row, or `null` when idle. */
  lifted: { rowId: string; from: number } | null;
  /** Hovered drop index (local), or `null`. */
  overIndex: number | null;
  /** Hovered edge, including the middle tree re-parent target. */
  overPosition: RowDropPosition | null;
  /** Move awaiting kit-owned confirmation, or `null`. */
  pendingMove: RowMoveRequest<TRow> | null;
  /**
   * Host-owned `confirmMove` is awaiting a decision. Kits disable grips,
   * buttons and menu items while this is true; they must not draw a second
   * confirmation surface.
   */
  hostConfirmPending: boolean;
  /** Live-region text. Empty until something happens. */
  announcement: string;
  /** Whether this row is the one being moved. */
  isLifted: (rowId: string) => boolean;
  /** Whether this row owns the open move confirmation. */
  isMovePending?: (row: TRow) => boolean;
  /** Pointer: start a drag from this row. */
  dragProps: (
    rowId: string,
    localIndex: number
  ) => {
    draggable: true;
    onDragStart: (event: TDragEvent) => void;
    onDragEnd: () => void;
  };
  /** Pointer: this row is a drop target. */
  dropProps: (
    localIndex: number,
    row: TRow,
    windowStart: number
  ) => {
    onDragOver: (event: TDragEvent) => void;
    onDrop: (event: TDragEvent) => void;
  };
  /** Keyboard: Space lifts / drops, arrows move, Escape cancels. */
  handleKeyDown: (
    event: TKeyEvent,
    rowId: string,
    localIndex: number,
    row: TRow,
    windowStart: number,
    rowCount: number
  ) => void;
  /** Mobile: swap with the neighbour. */
  moveBy: (
    localIndex: number,
    delta: -1 | 1,
    row: TRow,
    windowStart: number,
    rowCount: number
  ) => void;
  /** Keyboard/touch destinations for this row, when nested. */
  moveMenu: (row: TRow) => RowMoveMenuModel<TRow> | undefined;
  /** Select a destination from the move menu. */
  selectMoveTarget: (target: RowMoveTarget<TRow>) => void;
  /** Confirm the move shown by the kit confirmation surface. */
  confirmMove: () => void;
  /** Cancel the move shown by the kit confirmation surface. */
  cancelMove: () => void;
  /** Indicator attributes for a row. */
  rowAttrs: (
    rowId: string,
    localIndex: number
  ) => {
    "data-dragging"?: "";
    "data-drop"?: RowDropPosition;
  };
  /**
   * The drop target under a drag, current on every hover. When present,
   * `rowAttrs` and the hovered index above describe the table between
   * hovers, and each row follows its own drop edge here.
   */
  hover?: {
    /** Listen for a change. Returns the unsubscribe. */
    readonly subscribe: (listener: () => void) => () => void;
    /** The edge a drop on this row lands on, or `undefined`. */
    readonly dropAt: (
      rowId: string,
      localIndex: number
    ) => RowDropPosition | undefined;
  };
}

/**
 * Feature-state key for the row reorder state, published while the reorder
 * feature is composed.
 *
 * @public
 */
export const ROW_REORDER =
  featureStateKey<RowReorderState<unknown>>("row-reorder");
