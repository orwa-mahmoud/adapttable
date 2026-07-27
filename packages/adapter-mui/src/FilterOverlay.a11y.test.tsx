/**
 * Accessibility contract for the filter overlay (issue #26). Locks in the
 * shared `CLAUDE.md` "Filters and Columns overlay rules": `aria-expanded` on
 * the trigger (popover mode only), an axe-clean declarative form while open in
 * BOTH popover and drawer modes, Escape closing the overlay, outside-click
 * dismissing the popover, and the drawer trapping focus behind a backdrop.
 *
 * Where Chakra's Ark overlays defeat jsdom (it cannot drive Ark's
 * `closeOnInteractOutside` pointer sequence, nor run its browser-only
 * `restoreFocus`), MUI's non-modal `Popper` is fully jsdom-drivable: its
 * document-level Escape listener and `ClickAwayListener mouseEvent="onMouseDown"`
 * both fire under `fireEvent`, and the popover's Escape handler hands focus
 * back to the trigger itself — so this file asserts that restoration too.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { createTheme, ThemeProvider } from "@mui/material";
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

const theme = createTheme();

function renderTable(
  override: Partial<Omit<DataTableProps<Person>, "mode">> = {}
) {
  return render(
    <ThemeProvider theme={theme}>
      <DataTable<Person>
        data={PEOPLE}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("")}
        filters={FILTERS}
        {...override}
      />
    </ThemeProvider>
  );
}

const trigger = () => screen.getByRole("button", { name: /filters/i });

/**
 * The auto-built declarative form region inside the open overlay. `AutoFilterForm`
 * renders its widgets inside a single `MuiStack-root`, so scanning that node
 * targets the real labelled controls in BOTH popover and drawer modes. (The axe
 * specs scan the whole named overlay; this is for control-level lookups.)
 */
async function openFilterForm(): Promise<HTMLElement> {
  fireEvent.click(trigger());
  // The select labelled "Status" is the column filter; the numberRange's
  // operator select is labelled "Age". Both live only inside the open overlay.
  const status = await screen.findByLabelText("Status");
  return status.closest<HTMLElement>(".MuiStack-root") ?? status;
}

/**
 * Dismiss the overlay and wait for MUI to unmount it, so the popover's
 * document-level keydown listener is torn down before the next spec — a stale
 * one (from an un-closed prior overlay) would otherwise shadow a later Escape.
 * The popover's listener is on `document`, but the modal Drawer's Escape handler
 * lives on the Modal subtree, so target the open dialog when one is present.
 */
async function closeOverlay(): Promise<void> {
  const dialog = screen.queryByRole("dialog");
  fireEvent.keyDown(dialog ?? document.body, { key: "Escape" });
  await waitFor(() => expect(screen.queryByLabelText("Age")).toBeNull());
}

describe("filter overlay a11y (axe) — MUI", () => {
  // Each spec that opens an overlay also closes it before finishing: the
  // popover attaches a document-level keydown listener while open, and a stale
  // one (from an un-closed prior overlay) can shadow the live overlay's Escape
  // in the next test. `cleanup` unmounts the React tree; closing first lets MUI
  // detach its listeners cleanly.
  afterEach(cleanup);

  it("toggles aria-expanded on the popover trigger across open/close", async () => {
    renderTable();
    // Closed: the trigger advertises a collapsed disclosure.
    expect(trigger()).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger());
    await screen.findByLabelText("Status");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    // Re-clicking the open trigger closes it back to collapsed.
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
      expect(await axe(form, axeOpts)).toHaveNoViolations();
      await closeOverlay();
    },
    AXE_TIMEOUT_MS
  );

  it(
    "the open drawer's declarative form has no axe violations",
    async () => {
      renderTable({ filtersMode: "drawer" });
      await openFilterForm();
      // The Drawer's Paper dialog — now named via
      // `slotProps={{ paper: { "aria-label": labels.filters } }}` in
      // FilterDrawer — is axe-clean, wrapper and controls alike.
      const dialog = screen.getByRole("dialog");
      expect(await axe(dialog, axeOpts)).toHaveNoViolations();
      await closeOverlay();
    },
    AXE_TIMEOUT_MS
  );

  it("Escape closes the popover", async () => {
    renderTable();
    await openFilterForm();
    // FilterPopover installs a document-level keydown listener that closes on
    // Escape wherever focus sits.
    fireEvent.keyDown(document.body, { key: "Escape" });
    // The trigger reports collapsed and the numberRange operator select
    // (labelled "Age", unique to the open form) leaves the DOM.
    await waitFor(() => {
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByLabelText("Age")).toBeNull();
    });
    // Escape also hands focus back to the trigger — the popover's own
    // document listener does it (the non-modal Popper has no Modal to).
    expect(trigger()).toHaveFocus();
  });

  it("outside click (mousedown) closes the popover", async () => {
    renderTable();
    await openFilterForm();
    // ClickAwayListener listens on `onMouseDown`; a mousedown outside the card
    // dismisses it. (A `click` alone would not trigger this listener.)
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByLabelText("Age")).toBeNull();
    });
  });

  it("opening the drawer moves focus into the dialog behind a backdrop", async () => {
    renderTable({ filtersMode: "drawer" });
    fireEvent.click(trigger());
    // MUI's temporary Drawer is a Modal exposing role="presentation".
    const dialog = await screen.findByRole("presentation");
    // The Modal moves focus into the panel and renders a dimming backdrop.
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true)
    );
    expect(document.querySelector(".MuiBackdrop-root")).toBeTruthy();
    await closeOverlay();
  });

  it("Escape closes the drawer", async () => {
    renderTable({ filtersMode: "drawer" });
    await openFilterForm();
    const dialog = screen.getByRole("dialog");
    // MUI's Modal closes on Escape by default, but its handler lives on the
    // Modal subtree (not `document`), so fire the keydown inside the dialog —
    // unlike the popover, which installs its own document-level listener.
    fireEvent.keyDown(dialog, { key: "Escape" });
    // Drawer mode leaves `aria-expanded` off the trigger (it is a disclosure
    // concept reserved for the inline popover), so assert the dialog itself
    // unmounts.
    await waitForElementToBeRemoved(dialog);
    expect(screen.queryByLabelText("Age")).toBeNull();
  });
});
