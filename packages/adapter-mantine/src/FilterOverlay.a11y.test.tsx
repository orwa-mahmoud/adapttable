/**
 * Accessibility contract for the filter overlay (issue #26). Locks in the
 * shared `CLAUDE.md` "Filters and Columns overlay rules" for the Mantine kit:
 * `aria-expanded` on the trigger, an axe-clean declarative form while open in
 * BOTH popover and drawer modes, Escape closing the overlay, outside-click
 * dismissing the (backdrop-less) popover, and the drawer trapping focus behind
 * a real backdrop.
 *
 * Mantine's overlays are driven by Floating UI (popover) and a focus-trapping
 * Drawer; jsdom honours more of them than Chakra's Ark layer, but with kit
 * quirks that shape the assertions — each documented inline:
 *  - Mantine keeps the popover dropdown MOUNTED (just `display:none`) when
 *    closed, so closure is asserted via the trigger's `aria-expanded`, not by
 *    the form unmounting (as the Chakra suite does).
 *  - Escape and outside-click dismiss listeners are bound to the open overlay,
 *    not `document.body`; the keystroke is therefore dispatched from a control
 *    INSIDE the overlay (where real keyboard focus sits), and the outside
 *    pointer via `mouseDown` on `document.body` — both fire `onDismiss` in
 *    jsdom here.
 *  - In drawer mode the trigger is rendered bare (no `Popover.Target`), so it
 *    carries no `aria-expanded`; drawer closure is asserted by the dialog
 *    unmounting.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { MantineProvider } from "@mantine/core";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
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

// A select column filter + a standalone numberRange exercises the full
// auto-built form, so axe scans real, labelled form controls — not an empty
// card. The numberRange's operator select is labelled "Age Operator", giving
// the open form a node that does NOT collide with the "Status" column header.
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
    <MantineProvider>
      <DataTable<Person>
        data={PEOPLE}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("")}
        filters={FILTERS}
        {...override}
      />
    </MantineProvider>
  );
}

const trigger = () => screen.getByRole("button", { name: /filters/i });

/**
 * Open the overlay and return a stable container around the declarative form.
 * The "Status" column filter is a Mantine `NativeSelect` (a real `<select>`)
 * found by its label even while the popover dropdown is `display:none` in
 * jsdom (Floating UI never positions it). The container is the popover
 * dropdown (`role="dialog"`) or the drawer body, whichever wraps the control.
 */
async function openFilterForm(): Promise<HTMLElement> {
  fireEvent.click(trigger());
  const status = await screen.findByLabelText("Status");
  return (
    status.closest<HTMLElement>(".mantine-Popover-dropdown") ??
    status.closest<HTMLElement>(".mantine-Drawer-body") ??
    status
  );
}

/**
 * Dismiss the open popover and wait for its trigger to report collapsed. The
 * dismiss listener is bound to the open dropdown, so Escape is dispatched from
 * a control inside it (where real keyboard focus sits) — `document.body` would
 * be ignored. Mantine keeps the dropdown mounted (hidden) on close, hence the
 * `aria-expanded` assertion rather than waiting for an unmount.
 */
async function closePopover(): Promise<void> {
  fireEvent.keyDown(await screen.findByLabelText("Status"), { key: "Escape" });
  await waitFor(() =>
    expect(trigger()).toHaveAttribute("aria-expanded", "false")
  );
}

describe("filter overlay a11y (axe) — Mantine", () => {
  // Each spec that opens an overlay also closes it before finishing: Mantine
  // binds document-level dismiss/escape listeners to the open overlay, and a
  // stale one (from an un-closed prior overlay) can shadow the live overlay in
  // the next test. `cleanup` unmounts the React tree; closing first lets
  // Mantine detach its listeners cleanly.
  afterEach(cleanup);

  it("toggles aria-expanded on the popover trigger across open/close", async () => {
    renderTable();
    // Closed: the trigger advertises a collapsed disclosure.
    expect(trigger()).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger());
    await screen.findByLabelText("Status");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    // Re-clicking the open trigger closes it (Toolbar's onToggleFilters flips
    // the controlled `opened`, which both the manual attribute and
    // Popover.Target track back to "false").
    fireEvent.click(trigger());
    await waitFor(() =>
      expect(trigger()).toHaveAttribute("aria-expanded", "false")
    );
  });

  it(
    "the open popover's declarative form has no axe violations",
    async () => {
      renderTable();
      // The dropdown carries role="dialog"; Mantine names it via
      // aria-labelledby (its Filters heading), so axe finds no dialog-name gap
      // and the whole open card scans clean.
      const form = await openFilterForm();
      expect(await axe(form, axeOpts)).toHaveNoViolations();
      await closePopover();
    },
    AXE_TIMEOUT_MS
  );

  it(
    "the open drawer's declarative form has no axe violations",
    async () => {
      renderTable({ filtersMode: "drawer" });
      const form = await openFilterForm();
      expect(await axe(form, axeOpts)).toHaveNoViolations();
      // Close the modal drawer so its focus trap + scroll lock are torn down
      // before the next spec.
      fireEvent.keyDown(document.body, { key: "Escape" });
      await waitForElementToBeRemoved(() => screen.queryByRole("dialog"));
    },
    AXE_TIMEOUT_MS
  );

  it("Escape closes the popover", async () => {
    renderTable();
    await openFilterForm();
    // Escape from inside the open dropdown runs Floating UI's dismiss →
    // onDismiss → onCloseFilters → the trigger reports collapsed.
    fireEvent.keyDown(await screen.findByLabelText("Status"), {
      key: "Escape",
    });
    await waitFor(() =>
      expect(trigger()).toHaveAttribute("aria-expanded", "false")
    );
    // NOTE: closure is asserted via `aria-expanded`, not by the form leaving
    // the DOM: Mantine keeps the popover dropdown mounted (toggled to
    // `display:none`) so its controls stay queryable after close. NOTE: the
    // browser-only restore of focus to the trigger is not run by jsdom, so
    // focus is not asserted here.
  });

  it("an outside click dismisses the (backdrop-less) popover", async () => {
    renderTable();
    await openFilterForm();
    // The popover has no scrim, so the background stays interactive; a pointer
    // press outside the dropdown reaches Floating UI's outside-press listener
    // and dismisses it. (Chakra's Ark equivalent cannot be driven this way in
    // jsdom; Mantine's `useClickOutside` fires on `mousedown` here.)
    fireEvent.mouseDown(document.body);
    await waitFor(() =>
      expect(trigger()).toHaveAttribute("aria-expanded", "false")
    );
  });

  it("opening the drawer moves focus into the dialog behind a backdrop", async () => {
    renderTable({ filtersMode: "drawer" });
    fireEvent.click(trigger());
    const dialog = await screen.findByRole("dialog");
    // Mantine's Drawer is modal: it traps focus inside the dialog and dims the
    // background with a real overlay element.
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true)
    );
    expect(document.querySelector(".mantine-Drawer-overlay")).toBeTruthy();
    // Close so the focus trap is released before the next spec.
    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitForElementToBeRemoved(dialog);
  });

  it("Escape closes the drawer", async () => {
    renderTable({ filtersMode: "drawer" });
    await openFilterForm();
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(document.body, { key: "Escape" });
    // Drawer mode leaves `aria-expanded` off the trigger (it renders bare, with
    // no Popover.Target to manage the disclosure), so assert the dialog itself
    // unmounts. Mantine plays a close transition, so wait for removal.
    await waitForElementToBeRemoved(dialog);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
