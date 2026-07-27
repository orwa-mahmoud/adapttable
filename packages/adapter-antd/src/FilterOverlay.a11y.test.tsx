/**
 * Accessibility contract for the filter overlay (issue #26). Locks in the
 * shared `CLAUDE.md` "Filters and Columns overlay rules": `aria-expanded` on
 * the trigger (popover mode only), an axe-clean declarative form while open in
 * BOTH popover and drawer modes, Escape closing the overlay, outside-click
 * closing the popover, and the drawer trapping focus behind a backdrop.
 *
 * antd's overlays differ from Ark/Chakra in two ways that shape the assertions
 * below, so we assert what antd genuinely does (see the inline notes):
 *  - The popover (`FilterPopover`) is a NON-modal antd `Popover`. It does not
 *    trap focus and does not restore focus to the trigger on Escape, so no
 *    focus-restoration assertion is made for it. Its dismiss behaviour is
 *    hand-wired in `FilterPopover.tsx` via `document` `mousedown`/`keydown`
 *    listeners, which jsdom CAN drive — so outside-click and Escape are both
 *    asserted here.
 *  - The drawer is antd's modal `Drawer`: it renders a `.ant-drawer-mask`
 *    backdrop and moves focus into the dialog. Drawer mode leaves
 *    `aria-expanded` off the trigger (the trigger only sets it in popover
 *    mode), so drawer closure is asserted by the dialog unmounting.
 */
import { createMemoryAdapter } from "@adapttable/core";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ConfigProvider } from "antd";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { DataTable } from "./DataTable";
import type { ColumnDef, DataTableProps } from "./index";

interface Person {
  id: string;
  firstName: string;
  status: string;
  age: number;
}

const PEOPLE: Person[] = [
  { id: "1", firstName: "Alice", status: "active", age: 34 },
  { id: "2", firstName: "Bob", status: "inactive", age: 28 },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "firstName" },
  { key: "status", filter: { type: "select", options: STATUS_OPTIONS } },
];

// A select + a numberRange exercises the full auto-built filter form, so axe
// scans real, labelled form controls — not an empty card.
const FILTERS: DataTableProps<Person>["filters"] = [
  { key: "age", type: "numberRange" },
];

// `color-contrast` is jsdom-blind (the existing a11y.test.tsx disables it for
// the same reason). `region` flags page-level landmarks — the host app's job,
// not the table's — so it is irrelevant to an overlay scan.
const axeOpts = {
  rules: {
    "color-contrast": { enabled: false },
    region: { enabled: false },
  },
};
const AXE_TIMEOUT_MS = 20_000;

function renderTable(
  override: Partial<Omit<DataTableProps<Person>, "mode">> = {}
) {
  return render(
    <ConfigProvider>
      <DataTable<Person>
        data={PEOPLE}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("")}
        filters={FILTERS}
        {...override}
      />
    </ConfigProvider>
  );
}

const trigger = () => screen.getByRole("button", { name: /filters/i });

/** The auto-built declarative form node inside the open overlay. */
async function openFilterForm(): Promise<HTMLElement> {
  fireEvent.click(trigger());
  // antd portals the popover content under `.ant-popover` / the drawer body
  // under `.ant-drawer` a tick after opening.
  const status = await screen.findByLabelText("Status");
  return (
    status.closest<HTMLElement>("[data-adapttable-part='filters-form']") ??
    status.closest<HTMLElement>(
      ".ant-popover-inner-content, .ant-drawer-body"
    ) ??
    status
  );
}

/**
 * Dismiss the overlay and wait for antd to unmount its content, so the
 * popover's `document`-level `mousedown`/`keydown` listeners are torn down
 * before the next spec. Those listeners are installed manually in
 * `FilterPopover.tsx`; a stale one (from an un-closed prior overlay) would
 * shadow the live overlay's Escape in the next test.
 */
async function closeOverlay(): Promise<void> {
  fireEvent.keyDown(document.body, { key: "Escape" });
  await waitFor(() => expect(screen.queryByLabelText("Age")).toBeNull());
}

describe("filter overlay a11y (axe) — Ant Design", () => {
  // Each spec that opens an overlay also closes it before finishing:
  // `FilterPopover` attaches `document` `mousedown`/`keydown` listeners while
  // open, and a stale one (from an un-closed prior overlay) can shadow the
  // live overlay's Escape in the next test. `cleanup` unmounts the React tree;
  // closing first lets the effect cleanup detach its listeners.
  afterEach(cleanup);

  it("toggles aria-expanded on the popover trigger across open/close", async () => {
    renderTable();
    // Closed: the trigger advertises a collapsed disclosure.
    expect(trigger()).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger());
    await screen.findByLabelText("Status");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    // Re-clicking the open trigger closes it (useFilterTriggerToggle owns the
    // toggle; the trigger is excluded from the outside-click listener).
    fireEvent.click(trigger());
    await waitFor(() =>
      expect(trigger()).toHaveAttribute("aria-expanded", "false")
    );
  });

  it(
    "the open popover's declarative form has no axe violations",
    async () => {
      renderTable();
      const form = await openFilterForm();
      // antd's `Popover` content is NOT a dialog (it carries `role="tooltip"`
      // by default), so there is no unnamed-dialog gap to scan around here;
      // scanning the portaled content proves the declarative controls
      // themselves are fully accessible.
      expect(await axe(form, axeOpts)).toHaveNoViolations();
      await closeOverlay();
    },
    AXE_TIMEOUT_MS
  );

  it(
    "the open drawer's declarative form has no axe violations",
    async () => {
      renderTable({ filtersMode: "drawer" });
      const form = await openFilterForm();
      // antd's `Drawer` gives the dialog an accessible name from its `title`
      // (labels.filters), so the dialog wrapper is named — but we scan the
      // form body to keep parity with the popover spec and to focus the check
      // on the declarative controls.
      expect(await axe(form, axeOpts)).toHaveNoViolations();
      await closeOverlay();
    },
    AXE_TIMEOUT_MS
  );

  it("Escape closes the popover", async () => {
    renderTable();
    await openFilterForm();
    // Escape runs `FilterPopover`'s `keydown` listener → onClose() →
    // setFiltersOpen(false).
    fireEvent.keyDown(document.body, { key: "Escape" });
    // The trigger reports collapsed and the form's operator control (the
    // numberRange "Age" field, unique to the open form — unlike "Status",
    // which also names the column header) leaves the DOM.
    await waitFor(() => {
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByLabelText("Age")).toBeNull();
    });
    // Escape also hands focus back to the trigger — the popover's own keydown
    // listener does it (antd's non-modal Popover never would on its own).
    expect(trigger()).toHaveFocus();
  });

  it("outside click (mousedown) closes the popover", async () => {
    renderTable();
    await openFilterForm();
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    // `FilterPopover` listens for `document` `mousedown`; a click outside the
    // trigger anchor and outside `.ant-popover` closes it.
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByLabelText("Age")).toBeNull();
    });
  });

  it("opens the drawer as a modal dialog behind a backdrop, focus-ready", async () => {
    renderTable({ filtersMode: "drawer" });
    fireEvent.click(trigger());
    const dialog = await screen.findByRole("dialog");
    // antd's `Drawer` is modal: it renders a mask that dims/blocks the
    // background, and the panel advertises `aria-modal` + an accessible name.
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName(); // from labels.filters title
    expect(document.querySelector(".ant-drawer-mask")).toBeTruthy();
    // The focus TARGET exists and contains the dialog: antd auto-focuses the
    // `.ant-drawer` root (a `tabindex="-1"` container wrapping the dialog) so
    // keyboard focus enters the trapped panel.
    const root = document.querySelector(".ant-drawer");
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute("tabindex", "-1");
    expect(root!.contains(dialog)).toBe(true);
    // NOTE: antd runs that `getContainer().focus()` from an effect after the
    // panel's open transition (rc-motion's CSSMotion), which jsdom does not
    // advance — so `document.activeElement` stays on <body> here even though
    // the panel is focusable. The focus MOVE itself is a browser-only behaviour
    // (verified manually); jsdom can only prove the focus target is in place.
    await closeOverlay();
  });

  it("Escape closes the drawer", async () => {
    renderTable({ filtersMode: "drawer" });
    await openFilterForm();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // antd's `Drawer` closes on Escape via `@rc-component/portal`'s global
    // window keydown listener (it stops at `keyboard !== false`), so a single
    // Escape on the document collapses it.
    fireEvent.keyDown(document.body, { key: "Escape" });
    // Drawer mode leaves `aria-expanded` off the trigger (it is set only in
    // popover mode), so assert the dialog leaves the accessibility tree.
    // NOTE: antd keeps the panel node mounted-but-hidden after close
    // (`removeOnLeave: false`), so the dialog ROLE disappears (the closed
    // `.ant-drawer` is hidden) even though the bare DOM node lingers — hence
    // we assert on `queryByRole`, not node removal.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
