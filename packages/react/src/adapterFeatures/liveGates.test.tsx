import { defaultLabels } from "@adapttable/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { cellNavigation } from "../features/cell-navigation";
import {
  FeatureProviders,
  FeatureSlot,
  slotRender,
  useTableRuntime,
} from "../features/providers";
import {
  COMMAND_PALETTE_LIVE,
  type ContextMenuLiveSlotProps,
  EDITABLE_CELL,
  type EditableCellSlotProps,
  SIDE_PANEL,
  TOOLBAR_EXTRAS,
} from "../features/slotKeys";
import {
  applyTableFeatures,
  type TableFeature,
} from "../features/tableFeature";
import {
  type AdapterCommandPaletteProps,
  type AdapterCommandPaletteTriggerProps,
  createAdapterCommandPaletteFeature,
} from "./commandPalette";
import {
  type AdapterContextMenuProps,
  createAdapterContextMenuFeature,
} from "./contextMenu";
import { createAdapterEditingFeatures } from "./editing";
import { ContextMenuLiveGate, OptionalSidePanel } from "./featureRoot";

/**
 * The root gates and the palette trigger, driven through kit components the
 * way an adapter draws them.
 */
interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [{ id: "r1", name: "Ada" }];
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

/** A kit menu: one button per entry, disabled ones included. */
function KitMenu({ items, at }: AdapterContextMenuProps) {
  if (!at) return null;
  return (
    <div role="menu">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          data-disabled={item.disabled ? "" : undefined}
          onClick={item.onSelect}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

const contextMenu = createAdapterContextMenuFeature(KitMenu);

function tree<TRow>(
  features: readonly TableFeature<TRow>[],
  children: ReactNode
) {
  const props = applyTableFeatures({ features });
  return <FeatureProviders props={props}>{children}</FeatureProviders>;
}

function MenuTable({
  onCopy,
}: {
  readonly onCopy?: NonNullable<
    ContextMenuLiveSlotProps<never>["actions"]["onCopy"]
  >;
}) {
  return (
    <ContextMenuLiveGate
      props={{
        contextMenu: true,
        columns: COLUMNS as never,
        labels: defaultLabels,
        rowFor: (id) => ROWS.find((r) => r.id === id) as never,
        actions: onCopy ? { onCopy } : {},
      }}
    >
      {(regionProps) => (
        <table {...regionProps}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Old</th>
              <th>Gap</th>
            </tr>
          </thead>
          <tbody>
            <tr data-adapttable-part="row" data-row-id="r1">
              <td data-adapttable-part="cell" data-column-key="name">
                Ada
              </td>
              <td data-adapttable-part="cell" data-column-key="gone">
                stale
              </td>
              <td data-testid="row-gap">gap</td>
            </tr>
          </tbody>
        </table>
      )}
    </ContextMenuLiveGate>
  );
}

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  return writeText;
}

async function copyFrom(element: HTMLElement) {
  fireEvent.contextMenu(element, { clientX: 4, clientY: 4 });
  await act(async () => {
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }));
    await Promise.resolve();
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("context-menu Copy without cell navigation", () => {
  it("copies the right-clicked cell's value", async () => {
    const writeText = stubClipboard();
    const onCopy = vi.fn();
    render(tree([contextMenu()], <MenuTable onCopy={onCopy} />));

    await copyFrom(screen.getByText("Ada"));

    expect(writeText).toHaveBeenCalledWith("Ada");
    // The grid's own copy has no range to act on, so it is not called.
    expect(onCopy).not.toHaveBeenCalled();
  });

  it("copies nothing for a cell whose column is no longer shown", async () => {
    const writeText = stubClipboard();
    render(tree([contextMenu()], <MenuTable onCopy={vi.fn()} />));

    await copyFrom(screen.getByText("stale"));

    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies nothing for a row menu, whose Copy names no cell", async () => {
    const writeText = stubClipboard();
    render(tree([contextMenu()], <MenuTable onCopy={vi.fn()} />));

    await copyFrom(screen.getByTestId("row-gap"));

    expect(
      screen.getByRole("menuitem", { name: "Copy" }).dataset.disabled
    ).toBe("");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("offers no Copy when the host wired none", () => {
    render(tree([contextMenu()], <MenuTable />));

    fireEvent.contextMenu(screen.getByText("Ada"), { clientX: 4, clientY: 4 });

    expect(
      screen.queryByRole("menuitem", { name: "Copy" })
    ).not.toBeInTheDocument();
  });
});

describe("context-menu Copy with cell navigation", () => {
  it("leaves Copy to the grid's selection", async () => {
    const writeText = stubClipboard();
    const onCopy = vi.fn();
    render(
      tree([contextMenu(), cellNavigation()], <MenuTable onCopy={onCopy} />)
    );

    await copyFrom(screen.getByText("Ada"));

    expect(onCopy).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "cell", columnKey: "name", rowId: "r1" })
    );
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe("the side panel beside the table", () => {
  it("sits after the body unless it asks for the start", () => {
    const sidePanel: TableFeature = {
      id: "side-panel-test",
      renders: [slotRender(SIDE_PANEL, () => null)],
    };
    render(
      tree(
        [sidePanel],
        <OptionalSidePanel
          side="end"
          body={<span>table body</span>}
          panel={<span>panel</span>}
        />
      )
    );

    const region = screen.getByText("table body").parentElement?.parentElement;
    expect(region).toHaveStyle({ flexDirection: "row" });
  });
});

/** A kit palette: its open state and a close control. */
function KitPalette({ open, onClose, commands }: AdapterCommandPaletteProps) {
  return (
    <div>
      <output data-testid="palette">{open ? "open" : "closed"}</output>
      <output data-testid="palette-commands">{commands.length}</output>
      <button type="button" onClick={onClose}>
        close palette
      </button>
    </div>
  );
}

/** A kit toolbar control that opens the palette. */
function KitTrigger({
  onOpenPalette,
  paletteOpen,
  undoLabel,
}: AdapterCommandPaletteTriggerProps) {
  return (
    <button
      type="button"
      aria-expanded={paletteOpen}
      data-undo-label={undoLabel}
      onClick={onOpenPalette}
    >
      commands
    </button>
  );
}

function PaletteTable() {
  return (
    <>
      <FeatureSlot
        slot={TOOLBAR_EXTRAS}
        props={{
          undoLabel: "Undo",
          density: "comfortable",
          onDensityChange: () => undefined,
          labels: defaultLabels,
        }}
      />
      <FeatureSlot
        slot={COMMAND_PALETTE_LIVE}
        props={{ commandPalette: true, labels: defaultLabels }}
      />
    </>
  );
}

const paletteState = () => screen.getByTestId("palette").textContent;

describe("the command palette's toolbar control", () => {
  it("opens the palette it shares its state with", () => {
    const commandPalette = createAdapterCommandPaletteFeature(
      KitPalette,
      KitTrigger
    );
    render(tree([commandPalette({ button: true })], <PaletteTable />));

    const trigger = screen.getByRole("button", { name: "commands" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    // The toolbar's own props reach the kit control.
    expect(trigger).toHaveAttribute("data-undo-label", "Undo");
    expect(paletteState()).toBe("closed");

    fireEvent.click(trigger);
    expect(paletteState()).toBe("open");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "close palette" }));
    expect(paletteState()).toBe("closed");
  });

  it("draws no control unless the host asks for the button", () => {
    const commandPalette = createAdapterCommandPaletteFeature(
      KitPalette,
      KitTrigger
    );
    render(tree([commandPalette({})], <PaletteTable />));

    expect(
      screen.queryByRole("button", { name: "commands" })
    ).not.toBeInTheDocument();
    expect(paletteState()).toBe("closed");
  });

  it("draws no control for a kit that has none", () => {
    const commandPalette = createAdapterCommandPaletteFeature(KitPalette);
    const feature = commandPalette({ button: true });

    expect(feature.renders?.map((entry) => entry.slot.id)).toEqual([
      "command-palette-live",
    ]);
  });

  it("follows a host that controls the open state", () => {
    const onOpenChange = vi.fn();
    const commandPalette = createAdapterCommandPaletteFeature(
      KitPalette,
      KitTrigger
    );
    const { rerender } = render(
      tree(
        [commandPalette({ button: true, open: false, onOpenChange })],
        <PaletteTable />
      )
    );

    fireEvent.click(screen.getByRole("button", { name: "commands" }));
    // Controlled: the host is asked, and the palette waits for its answer.
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(paletteState()).toBe("closed");

    rerender(
      tree(
        [commandPalette({ button: true, open: true, onOpenChange })],
        <PaletteTable />
      )
    );
    expect(paletteState()).toBe("open");

    fireEvent.click(screen.getByRole("button", { name: "close palette" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("renders nothing for the trigger outside its feature's provider", () => {
    const commandPalette = createAdapterCommandPaletteFeature(
      KitPalette,
      KitTrigger
    );
    const feature = commandPalette({ button: true });
    const trigger = feature.renders?.find(
      (entry) => entry.slot.id === TOOLBAR_EXTRAS.id
    );
    // Drawn without the provider that holds the open state, the control has
    // nothing to open and draws nothing.
    render(<>{trigger?.render({} as never)}</>);

    expect(
      screen.queryByRole("button", { name: "commands" })
    ).not.toBeInTheDocument();
  });
});

describe("the kit's editable cell", () => {
  const KitCell = ({ display }: { readonly display?: ReactNode }) => (
    <span data-testid="kit-cell">{display}</span>
  );
  const features = createAdapterEditingFeatures({
    EditableCell: KitCell,
    RowEditActions: () => null,
    BatchEditBar: () => null,
    UndoRedoButtons: () => null,
  });

  function drawCell(slotProps: Partial<EditableCellSlotProps<never>>) {
    const base: EditableCellSlotProps<never> = {
      editing: undefined,
      row: ROWS[0] as never,
      column: COLUMNS[0] as never,
      rowId: "r1",
      rowIndex: 0,
      rows: ROWS as never[],
      columns: COLUMNS as never[],
      rowKey: () => "r1",
      editLabel: "Edit",
    };
    render(
      tree(
        [features.editing<Row>(vi.fn())],
        <FeatureSlot slot={EDITABLE_CELL} props={{ ...base, ...slotProps }} />
      )
    );
    return screen.getByTestId("kit-cell");
  }

  it("shows what the row already worked out", () => {
    expect(drawCell({ display: "precomputed" })).toHaveTextContent(
      "precomputed"
    );
  });

  it("shows the column's own Cell when nothing was worked out", () => {
    const column = {
      key: "name",
      Cell: ({ row }: { readonly row: Row }) => <b>{row.name}!</b>,
    };
    expect(drawCell({ column: column })).toHaveTextContent("Ada!");
  });

  it("falls back to the column's accessor", () => {
    expect(drawCell({})).toHaveTextContent("Ada");
  });
});

describe("the live table runtime", () => {
  it("names the features the table composed", () => {
    function Probe() {
      const runtime = useTableRuntime();
      return (
        <output data-testid="ids">{runtime.featureIds().join(",")}</output>
      );
    }
    render(tree([contextMenu()], <Probe />));

    expect(screen.getByTestId("ids")).toHaveTextContent("context-menu");
  });
});
