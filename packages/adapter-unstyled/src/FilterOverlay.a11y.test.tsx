/**
 * Accessibility contract for the filter overlay (issue #26). Locks in the
 * shared `CLAUDE.md` "Filters and Columns overlay rules": `aria-expanded` on
 * the trigger, an axe-clean declarative form while open in BOTH popover and
 * drawer modes, Escape closing the overlay, and the drawer moving focus into a
 * dialog behind a backdrop.
 *
 * Unlike Chakra (whose Ark overlays lean on browser-only pointer/focus
 * machinery jsdom cannot simulate), this kit is plain DOM with explicit
 * `document` listeners — so it honours the full contract in jsdom. We assert
 * every behaviour the shared rules demand, including outside-click dismissal
 * (the popover listens for `click`) and Escape-restores-focus-to-the-trigger,
 * which Chakra's suite has to skip.
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

// A select column filter ("Status") + a top-level numberRange ("Age")
// exercises the full auto-built filter form, so axe scans real, labelled form
// controls — not an empty card.
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
  // The plain-DOM kit needs NO provider wrapper — mount <DataTable /> directly.
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

/** Open the overlay and resolve once the auto-built form's "Status" select
 * (the select column filter) has mounted. */
async function openFilterForm(): Promise<void> {
  fireEvent.click(trigger());
  await screen.findByLabelText("Status");
}

/**
 * Dismiss the overlay via Escape and wait for the auto-built form to unmount
 * (the numberRange "Age" operator select is unique to the open form). Each
 * spec closes the overlay it opened so the hand-rolled `document` click/keydown
 * listeners are torn down before the next spec — a stale listener would
 * otherwise leak across tests and shadow a later Escape/outside-click.
 */
async function closeOverlay(): Promise<void> {
  fireEvent.keyDown(document.body, { key: "Escape" });
  await waitFor(() => expect(screen.queryByLabelText("Age")).toBeNull());
}

describe("filter overlay a11y (axe) — unstyled", () => {
  // `cleanup` unmounts the React tree; specs additionally close their overlay
  // first (see closeOverlay) so the document-level listeners detach cleanly.
  afterEach(cleanup);

  it("toggles aria-expanded on the popover trigger across open/close", async () => {
    renderTable();
    // Closed: the trigger advertises a collapsed disclosure.
    expect(trigger()).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger());
    await screen.findByLabelText("Status");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    // Re-clicking the open trigger closes it (useFilterTriggerToggle).
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
      const popover = document.querySelector<HTMLElement>(
        "[data-adapttable-part='filters-popover']"
      );
      expect(popover).toBeInstanceOf(HTMLElement);
      expect(await axe(popover!, axeOpts)).toHaveNoViolations();
      await closeOverlay();
    },
    AXE_TIMEOUT_MS
  );

  it(
    "the open drawer's declarative form has no axe violations",
    async () => {
      renderTable({ filtersMode: "drawer" });
      await openFilterForm();
      // The drawer is a labelled <dialog aria-modal> — scan it whole so the
      // dialog semantics are covered alongside the declarative controls.
      const dialog = await screen.findByRole("dialog");
      expect(await axe(dialog, axeOpts)).toHaveNoViolations();
      await closeOverlay();
    },
    AXE_TIMEOUT_MS
  );

  it("Escape closes the popover and restores focus to the trigger", async () => {
    renderTable();
    await openFilterForm();
    // Escape runs the popover's keydown listener → onClose → setFiltersOpen
    // false, and hands keyboard focus back to the trigger button.
    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => {
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByLabelText("Age")).toBeNull();
    });
    // This kit genuinely restores focus in jsdom (unlike Ark/Chakra).
    expect(trigger()).toHaveFocus();
  });

  it("an outside click closes the popover", async () => {
    renderTable();
    await openFilterForm();
    // The popover listens for `click` (not mousedown): a click outside the
    // anchor span dismisses it.
    fireEvent.click(document.body);
    await waitFor(() =>
      expect(trigger()).toHaveAttribute("aria-expanded", "false")
    );
    expect(screen.queryByLabelText("Age")).toBeNull();
  });

  it("opening the drawer moves focus into the dialog behind a backdrop", async () => {
    renderTable({ filtersMode: "drawer" });
    fireEvent.click(trigger());
    const dialog = await screen.findByRole("dialog");
    // The panel is tabIndex={-1} and grabs focus on open, so the active
    // element is the dialog itself (or a descendant of it).
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true)
    );
    // A real backdrop dims/blocks the background in drawer mode.
    expect(
      document.querySelector("[data-adapttable-part='filters-backdrop']")
    ).toBeTruthy();
    await closeOverlay();
  });

  it("Escape closes the drawer", async () => {
    renderTable({ filtersMode: "drawer" });
    await openFilterForm();
    await screen.findByRole("dialog");
    fireEvent.keyDown(document.body, { key: "Escape" });
    // Drawer mode leaves `aria-expanded` off the trigger (a disclosure concept
    // reserved for the inline popover), so assert the dialog itself unmounts.
    // This plain-DOM kit unmounts the portaled dialog synchronously on Escape.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
