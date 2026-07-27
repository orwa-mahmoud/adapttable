/**
 * Accessibility contract for the filter overlay (issue #26). Locks in the
 * shared `CLAUDE.md` "Filters and Columns overlay rules": `aria-expanded` on
 * the trigger, an axe-clean declarative form while open in BOTH popover and
 * drawer modes, Escape closing the overlay, and the drawer trapping focus
 * behind a backdrop.
 *
 * jsdom can drive Chakra v3's Ark overlays only so far: it cannot simulate the
 * pointer/focus sequence Ark's `closeOnInteractOutside` listens for — that
 * assertion lives with the kits jsdom CAN drive (e.g. MUI/unstyled). Escape,
 * however, is the popover's own document-level listener (Ark's `closeOnEscape`
 * is off because its focus restore only works through `Popover.Trigger`), so
 * both the close and the focus hand-back ARE asserted here.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
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
    <ChakraProvider value={defaultSystem}>
      <DataTable<Person>
        data={PEOPLE}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("")}
        filters={FILTERS}
        {...override}
      />
    </ChakraProvider>
  );
}

const trigger = () => screen.getByRole("button", { name: /filters/i });

/** The auto-built declarative form node inside the open overlay. */
async function openFilterForm(): Promise<HTMLElement> {
  fireEvent.click(trigger());
  // v3's Popover/Drawer mount their content a tick after opening.
  const status = await screen.findByLabelText("Status");
  return (
    status.closest<HTMLElement>("[data-adapttable-part='filters-form']") ??
    status.closest<HTMLElement>(
      ".chakra-popover__body, .chakra-drawer__body"
    ) ??
    status
  );
}

/**
 * Dismiss the overlay and wait for Ark to unmount it, so the open overlay's
 * document-level dismiss listener is torn down before the next spec — the axe
 * specs would otherwise leave it registered and shadow a later Escape.
 */
async function closeOverlay(): Promise<void> {
  fireEvent.keyDown(document.body, { key: "Escape" });
  await waitFor(() => expect(screen.queryByLabelText("Age")).toBeNull());
}

describe("filter overlay a11y (axe) — Chakra", () => {
  // Each spec that opens an overlay also closes it before finishing: Ark
  // attaches document-level dismiss listeners to the open overlay, and a stale
  // one (from an un-closed prior overlay) can shadow the live overlay's Escape
  // in the next test. `cleanup` unmounts the React tree; closing first lets Ark
  // detach its listeners cleanly.
  afterEach(cleanup);

  it("toggles aria-expanded on the popover trigger across open/close", async () => {
    renderTable();
    // Closed: the trigger advertises a collapsed disclosure.
    expect(trigger()).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger());
    await screen.findByLabelText("Status");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    // Re-clicking the open trigger closes it (the toggle survives Chakra's
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
      // — and its declarative controls are axe-clean.
      const overlay = document.querySelector<HTMLElement>(
        "[data-testid='adapttable-filter-popover']"
      );
      expect(overlay).not.toBeNull();
      expect(await axe(overlay!, axeOpts)).toHaveNoViolations();
      await closeOverlay();
    },
    AXE_TIMEOUT_MS
  );

  it(
    "the open drawer's declarative form has no axe violations",
    async () => {
      renderTable({ filtersMode: "drawer" });
      const form = await openFilterForm();
      expect(await axe(form, axeOpts)).toHaveNoViolations();
      await closeOverlay();
    },
    AXE_TIMEOUT_MS
  );

  it("Escape closes the popover", async () => {
    renderTable();
    await openFilterForm();
    // Escape runs Ark's dismiss → onOpenChange(false) → setFiltersOpen(false).
    fireEvent.keyDown(document.body, { key: "Escape" });
    // The trigger reports collapsed and the form's Value/operator control (the
    // numberRange field, unique to the open form — unlike "Status", which also
    // names the column header) leaves the DOM.
    await waitFor(() => {
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByLabelText("Age")).toBeNull();
    });
    // Escape also hands focus back to the trigger — the popover's own
    // document-level listener does it (Ark's restore only works through
    // `Popover.Trigger`, which this anchored layout doesn't use).
    expect(trigger()).toHaveFocus();
  });

  it("opening the drawer moves focus into the dialog behind a backdrop", async () => {
    renderTable({ filtersMode: "drawer" });
    fireEvent.click(trigger());
    const dialog = await screen.findByRole("dialog");
    // Chakra's Drawer is modal: focus moves into the dialog and a backdrop
    // dims/blocks the background.
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true)
    );
    expect(
      document.querySelector(".chakra-drawer__backdrop") ??
        document.querySelector('[data-part="backdrop"]')
    ).toBeTruthy();
    await closeOverlay();
  });

  it("Escape closes the drawer", async () => {
    renderTable({ filtersMode: "drawer" });
    await openFilterForm();
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(document.body, { key: "Escape" });
    // Drawer mode leaves `aria-expanded` off the trigger (it is a disclosure
    // concept reserved for the inline popover), so assert the dialog itself
    // unmounts.
    await waitForElementToBeRemoved(dialog);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
