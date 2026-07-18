/**
 * Accessibility contract for the filter overlay (issue #26). Locks in the
 * shared `CLAUDE.md` "Filters and Columns overlay rules" for the Base UI
 * kit: `aria-expanded` on the trigger, an axe-clean declarative form while open
 * in BOTH popover and drawer modes, Escape closing the overlay (and restoring
 * focus to the trigger for the popover), outside-click dismissing the popover,
 * and the drawer trapping focus behind a backdrop.
 *
 * Base UI' overlays are unusually faithful in jsdom: the popover restores
 * focus to its trigger on close (Base UI runs its own `focusScope`, not a
 * browser-only path), and outside-click dismissal fires once the full
 * pointer→mouse→click sequence reaches the document. The two facts jsdom does
 * NOT let us paper over are noted inline:
 *  - the popover's content node carries `role="dialog"` but Base UI'
 *    `Popover.Content` leaves it unnamed → a real `aria-dialog-name` violation
 *    on the WRAPPER (the drawer, named by its `Dialog.Title`, is clean). We
 *    scan the inner declarative form, which proves the controls themselves are
 *    fully accessible, and report the wrapper gap.
 */
import { createMemoryAdapter } from "@adapttable/core";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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

// A select + a numberRange exercises the full auto-built filter form, so axe
// scans real, labelled form controls — not an empty card. The numberRange's
// operator-first "Operator" combobox is unique to the OPEN overlay (unlike the
// "Status" select, whose name doubles the column header), so it doubles as the
// open/closed sentinel for close-detection.
const FILTERS: DataTableProps<Person>["filters"] = [
  { key: "age", type: "numberRange" },
];

// `color-contrast` is jsdom-blind (the package's a11y.test.tsx disables it for
// the same reason). `region` flags page-level landmarks — the host app's job,
// not the table's — so it is irrelevant to an overlay scan.
const axeOpts = {
  rules: {
    "color-contrast": { enabled: false },
    region: { enabled: false },
  },
};
const AXE_TIMEOUT_MS = 20_000;

function renderTable(override: Partial<DataTableProps<Person>> = {}) {
  return render(
    <DataTable<Person>
      data={PEOPLE}
      columns={COLUMNS}
      rowKey={(r) => r.id}
      urlAdapter={createMemoryAdapter("")}
      filters={FILTERS}
      {...override}
    />
  );
}

const trigger = () => screen.getByRole("button", { name: /filters/i });

/** The Base UI `Select` controls render as comboboxes named by their field label. */
const statusSelect = () => screen.queryByRole("combobox", { name: "Status" });
const operatorSelect = () =>
  screen.queryByRole("combobox", { name: "Operator" });

/** Open the overlay and resolve the auto-built declarative form root. */
async function openFilterForm(): Promise<HTMLElement> {
  fireEvent.click(trigger());
  // Base UI's Popover/Dialog mount their content a tick after opening.
  const status = await screen.findByRole("combobox", { name: "Status" });
  const operator = await screen.findByRole("combobox", { name: "Operator" });
  // Returns the declarative form root — the nearest common ancestor of the
  // Status + Operator controls — without depending on a Radix-internal class
  // name. (Both overlay dialogs are named now, so the axe specs scan the whole
  // overlay; this helper is for control-level lookups.)
  let node: HTMLElement | null = status;
  let formRoot: HTMLElement = status;
  while (node) {
    if (node.contains(operator)) {
      formRoot = node;
      break;
    }
    node = node.parentElement;
  }
  return formRoot;
}

/**
 * Dismiss the overlay (Escape) and wait for Base UI to unmount it, so the open
 * overlay's document-level dismiss listener is torn down before the next spec —
 * a stale one can shadow a later overlay's Escape. The unique "Operator"
 * combobox leaving the DOM proves the overlay is gone.
 */
async function closeOverlay(): Promise<void> {
  fireEvent.keyDown(document.body, { key: "Escape" });
  await waitFor(() => expect(operatorSelect()).toBeNull());
}

describe("filter overlay a11y (axe) — Base UI", () => {
  // Each spec that opens an overlay also closes it before finishing: Radix
  // attaches document-level dismiss listeners to the open overlay, and a stale
  // one (from an un-closed prior overlay) can shadow the live overlay's Escape
  // in the next test. `cleanup` unmounts the React tree; closing first lets
  // Base UI detach its listeners cleanly.
  afterEach(cleanup);

  it("toggles aria-expanded on the popover trigger across open/close", async () => {
    renderTable();
    // Closed: the trigger advertises a collapsed disclosure. Base UI's
    // `Popover.Trigger` and the toolbar's explicit `aria-expanded` agree.
    expect(trigger()).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger());
    await screen.findByRole("combobox", { name: "Status" });
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    // Re-clicking the open trigger closes it (the toggle survives Base UI's
    // outside-close via useFilterTriggerToggle).
    fireEvent.click(trigger());
    await waitFor(() =>
      expect(trigger()).toHaveAttribute("aria-expanded", "false")
    );
  });

  it(
    "the open popover's declarative form has no axe violations",
    async () => {
      renderTable();
      await openFilterForm();
      // The whole popover dialog — now named via `aria-label={labels.filters}`
      // on `Popover.Content` — is axe-clean, wrapper and controls alike.
      const dialog = document.querySelector<HTMLElement>(
        "[data-testid='adapttable-filter-popover']"
      );
      expect(dialog).not.toBeNull();
      expect(await axe(dialog!, axeOpts)).toHaveNoViolations();
      await closeOverlay();
    },
    AXE_TIMEOUT_MS
  );

  it(
    "the open drawer's declarative form has no axe violations",
    async () => {
      renderTable({ filtersMode: "drawer" });
      // The drawer is a real `Dialog`, named by its `Dialog.Title`, so the
      // whole dialog (wrapper included) is axe-clean — no inner-only scan
      // needed.
      fireEvent.click(trigger());
      const dialog = await screen.findByRole("dialog");
      await screen.findByRole("combobox", { name: "Status" });
      expect(await axe(dialog, axeOpts)).toHaveNoViolations();
      await closeOverlay();
    },
    AXE_TIMEOUT_MS
  );

  it("Escape closes the popover and restores focus to the trigger", async () => {
    renderTable();
    await openFilterForm();
    // Escape runs Base UI's dismiss → onOpenChange(false) → setFiltersOpen(false).
    fireEvent.keyDown(document.body, { key: "Escape" });
    // The trigger reports collapsed and the unique "Operator" control leaves
    // the DOM.
    await waitFor(() => {
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(operatorSelect()).toBeNull();
    });
    // Base UI' `Popover` runs its own focus scope, which jsdom honours:
    // closing restores focus to the trigger (unlike Chakra/Ark's browser-only
    // restore, which jsdom skips).
    expect(document.activeElement).toBe(trigger());
  });

  it("outside-click closes the popover", async () => {
    renderTable();
    await openFilterForm();
    // Base UI's `DismissableLayer` listens for the full pointer→mouse→click
    // sequence; a bare `pointerDown` is not enough in jsdom (verified — it
    // leaves the overlay open), so drive the complete outside-click gesture.
    fireEvent.pointerDown(document.body);
    fireEvent.mouseDown(document.body);
    fireEvent.click(document.body);
    await waitFor(() => {
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(operatorSelect()).toBeNull();
    });
  });

  it("opening the drawer moves focus into the dialog behind a backdrop", async () => {
    renderTable({ filtersMode: "drawer" });
    // Drawer mode leaves `aria-expanded` off the trigger — it is a disclosure
    // concept reserved for the inline popover.
    expect(trigger()).not.toHaveAttribute("aria-expanded");

    fireEvent.click(trigger());
    const dialog = await screen.findByRole("dialog");
    // Base UI's Dialog is modal: focus moves into the dialog and the
    // `Dialog.Overlay` backdrop dims/blocks the background.
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true)
    );
    expect(document.querySelector(".adapttable-drawer-backdrop")).toBeTruthy();
    await closeOverlay();
  });

  it("Escape closes the drawer", async () => {
    renderTable({ filtersMode: "drawer" });
    fireEvent.click(trigger());
    await screen.findByRole("dialog");
    fireEvent.keyDown(document.body, { key: "Escape" });
    // Drawer mode keeps no `aria-expanded` on the trigger (and the trigger is
    // inert behind the modal), so assert the dialog (and its declarative form)
    // unmount. Base UI detaches the dialog from the accessibility tree on close —
    // re-query the role rather than watch the captured node, which lingers
    // briefly during Base UI's teardown.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(statusSelect()).toBeNull();
    });
  });
});
