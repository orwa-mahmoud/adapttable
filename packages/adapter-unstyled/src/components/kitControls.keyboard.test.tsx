/**
 * The row-move menu and the strip that asks a human before an agent writes.
 *
 * Both surfaces are drawn by each kit's own components and reached only
 * through the public `RowReorderHandle` / `AgentApproval` faces, so the
 * contract they share — Escape abandons the pending move, Enter and Space
 * pick a destination, and both approval decisions reach the host — is proven
 * in the kit rather than once in core.
 */
import type {
  RowMoveMenuModel,
  RowMoveRequest,
  RowMoveTarget,
  RowReorderLabels,
  RowReorderState,
} from "@adapttable/react/adapter";
import {
  fireEvent,
  render as renderKit,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgentApproval, RowReorderHandle } from "./kitControls";

interface Row {
  readonly name: string;
}

const ROW: Row = { name: "Ship" };

const LABELS: RowReorderLabels = {
  reorderRow: "Reorder row",
  moveRowUp: "Move row up",
  moveRowDown: "Move row down",
  rowLifted: () => "",
  rowMoved: () => "",
  rowReorderCancelled: "",
  confirmRowMoveTitle: "Move row?",
  confirmRowMoveDescription: (row, from, to) => `${row}: ${from} to ${to}`,
  confirmRowMove: "Move",
  cancel: "Keep",
};

const TARGET: RowMoveTarget<Row> = { id: "docs", label: "Move to Docs" };

const MENU: RowMoveMenuModel<Row> = {
  kind: "group",
  label: "Move row",
  targets: [TARGET],
};

const PENDING: RowMoveRequest<Row> = {
  kind: "group",
  row: ROW,
  rowLabel: "Ship",
  fromGroup: { id: "core", label: "Core", levels: [] },
  toGroup: { id: "docs", label: "Docs", levels: [] },
  position: 0,
};

interface Handlers {
  readonly selectMoveTarget?: (target: RowMoveTarget<Row>) => void;
  readonly confirmMove?: () => void;
  readonly cancelMove?: () => void;
}

function reorderState(
  pendingMove: RowMoveRequest<Row> | null,
  handlers: Handlers = {}
): RowReorderState<Row> {
  return {
    lifted: null,
    overIndex: null,
    overPosition: null,
    pendingMove,
    hostConfirmPending: false,
    announcement: "",
    isLifted: () => false,
    dragProps: () => ({
      draggable: true,
      onDragStart: () => undefined,
      onDragEnd: () => undefined,
    }),
    dropProps: () => ({
      onDragOver: () => undefined,
      onDrop: () => undefined,
    }),
    handleKeyDown: () => undefined,
    moveBy: () => undefined,
    moveMenu: () => MENU,
    selectMoveTarget: handlers.selectMoveTarget ?? (() => undefined),
    confirmMove: handlers.confirmMove ?? (() => undefined),
    cancelMove: handlers.cancelMove ?? (() => undefined),
    rowAttrs: () => ({}),
  };
}

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

function mountHandle(
  pendingMove: RowMoveRequest<Row> | null,
  handlers: Handlers = {}
): void {
  renderKit(
    <RowReorderHandle
      reorder={reorderState(pendingMove, handlers)}
      labels={LABELS}
      rowId="1"
      localIndex={0}
      row={ROW}
      windowStart={0}
      rowCount={2}
    />
  );
}

/** A real press is a pointer-down then a click; kits open on one or the other. */
function openTrigger(): void {
  const trigger = part("row-move-menu-trigger");
  if (!trigger) throw new Error("the move menu has no trigger");
  // A kit that opened its own surface would read a second press as a
  // dismissal, so the trigger's own state decides whether to press it.
  if (trigger.getAttribute("aria-expanded") === "true") return;
  fireEvent.pointerDown(trigger, { button: 0 });
  fireEvent.click(trigger);
}

/**
 * Some kits float the confirmation themselves; others put it inside the move
 * menu and open that menu for the user. Opening the trigger when the dialog
 * is not already up covers both without asserting which surface a kit chose.
 */
async function pendingMove(handlers: Handlers = {}): Promise<HTMLElement> {
  mountHandle(PENDING, handlers);
  if (!part("row-move-confirmation")) {
    openTrigger();
  }
  return await waitFor(() => {
    const dialog = part("row-move-confirmation");
    if (!dialog) throw new Error("the confirmation never appeared");
    return dialog;
  });
}

async function openMenu(
  selectMoveTarget: (target: RowMoveTarget<Row>) => void
): Promise<HTMLElement> {
  mountHandle(null, { selectMoveTarget });
  openTrigger();
  return await waitFor(() => {
    const entry = part("row-move-menu-item");
    if (!entry) throw new Error("the move menu never opened");
    return entry;
  });
}

/**
 * Enter and Space pick the destination. A kit that renders the entry as a
 * real `<button>` gets that from the platform — jsdom does not synthesise the
 * click a browser would raise — so there the contract is that the entry IS a
 * button; a kit that draws its own menu item has to implement the keys.
 */
function pressKey(entry: HTMLElement, key: string): void {
  if (entry.tagName === "BUTTON") {
    if (key === "Enter" || key === " ") fireEvent.click(entry);
    return;
  }
  fireEvent.keyDown(entry, { key });
  // Space activates a non-native widget on release, so a press that stops at
  // key-down would never reach a kit that follows the platform.
  fireEvent.keyUp(entry, { key });
}

describe("row move confirmation (unstyled)", () => {
  it("names the move it is asking about", async () => {
    const dialog = await pendingMove();
    expect(dialog).toHaveAttribute("role", "alertdialog");
    expect(dialog).toHaveAccessibleName("Move row?");
    expect(dialog.textContent).toContain("Ship: Core to Docs");
  });

  it("commits the move on confirm", async () => {
    const confirmMove = vi.fn();
    const cancelMove = vi.fn();
    const dialog = await pendingMove({ confirmMove, cancelMove });
    fireEvent.click(within(dialog).getByRole("button", { name: "Move" }));
    expect(confirmMove).toHaveBeenCalledTimes(1);
    expect(cancelMove).not.toHaveBeenCalled();
  });

  it("abandons the pending move on Escape", async () => {
    const confirmMove = vi.fn();
    const cancelMove = vi.fn();
    const dialog = await pendingMove({ confirmMove, cancelMove });
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => {
      expect(cancelMove).toHaveBeenCalledTimes(1);
    });
    expect(confirmMove).not.toHaveBeenCalled();
  });

  it("leaves the move pending on any other key", async () => {
    const cancelMove = vi.fn();
    const dialog = await pendingMove({ cancelMove });
    fireEvent.keyDown(dialog, { key: "a" });
    expect(cancelMove).not.toHaveBeenCalled();
  });

  it("abandons the pending move on cancel", async () => {
    const confirmMove = vi.fn();
    const cancelMove = vi.fn();
    const dialog = await pendingMove({ confirmMove, cancelMove });
    fireEvent.click(within(dialog).getByRole("button", { name: "Keep" }));
    expect(cancelMove).toHaveBeenCalledTimes(1);
    expect(confirmMove).not.toHaveBeenCalled();
  });
});

describe("row move menu keyboard (unstyled)", () => {
  it("picks a destination with Enter", async () => {
    const selectMoveTarget = vi.fn();
    const entry = await openMenu(selectMoveTarget);
    pressKey(entry, "Enter");
    expect(selectMoveTarget).toHaveBeenCalledWith(TARGET);
  });

  it("picks a destination with Space", async () => {
    const selectMoveTarget = vi.fn();
    const entry = await openMenu(selectMoveTarget);
    pressKey(entry, " ");
    expect(selectMoveTarget).toHaveBeenCalledWith(TARGET);
  });

  it("ignores a key that is neither", async () => {
    const selectMoveTarget = vi.fn();
    const entry = await openMenu(selectMoveTarget);
    pressKey(entry, "x");
    expect(selectMoveTarget).not.toHaveBeenCalled();
  });
});

describe("agent approval strip (unstyled)", () => {
  it("renders the proposal and routes both decisions", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    renderKit(
      <AgentApproval
        proposals={[
          { rowKey: "1", column: "title", before: "Ship", after: "Shipped" },
        ]}
        onApprove={onApprove}
        onReject={onReject}
      />
    );
    const list = part("agent-approval-list");
    expect(list).not.toBeNull();
    expect(list).toHaveAccessibleName();
    expect(list?.textContent).toContain("Shipped");

    fireEvent.click(part("agent-approval-approve")!);
    expect(onApprove).toHaveBeenCalledTimes(1);
    fireEvent.click(part("agent-approval-reject")!);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("shows nothing while no write is proposed", () => {
    renderKit(<AgentApproval onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(part("agent-approval")).toBeNull();
  });
});
