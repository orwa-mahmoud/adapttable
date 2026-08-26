import type { ColumnDef } from "@adapttable/core";
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable, SavedViewsPanel, shadcnClassNames } from "./index";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Linus" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

let adapter: ReturnType<typeof createMemoryAdapter>;

function Harness({
  classNames,
  density,
}: {
  classNames?: NonNullable<Parameters<typeof DataTable<Row>>[0]["classNames"]>;
  density?: "comfortable" | "compact";
}) {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: adapter,
    columns,
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      classNames={classNames}
      density={density}
    />
  );
}

function renderHarness(
  classNames?: Parameters<typeof Harness>[0]["classNames"],
  extra?: { density?: "comfortable" | "compact" }
) {
  adapter = createMemoryAdapter("");
  return render(<Harness classNames={classNames} density={extra?.density} />);
}

/** A custom card body reaches through the preset wrapper too. */
function CardHarness() {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: adapter,
    columns,
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      forceMobile
      renderCard={(row, card) => (
        <p>
          {row.name} · {card.fields.length}
        </p>
      )}
    />
  );
}

/** The error slot reaches through the preset wrapper to the unstyled shell. */
function ErrorHarness() {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: adapter,
    columns,
    error: new Error("boom"),
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      slots={{ error: (state) => <output>mine: {state.error.message}</output> }}
    />
  );
}

describe("@adapttable/shadcn", () => {
  it("renders a shadcn-styled table from a single import", () => {
    const { container, getByText } = renderHarness();
    expect(getByText("Ada")).toBeInTheDocument();
    // The root and table carry the shadcn preset classes (no-override path).
    expect(container.querySelector(".bg-card.border-border")).not.toBeNull();
    expect(container.querySelector(".border-collapse")).not.toBeNull();
  });

  it("merges per-part overrides over the preset", () => {
    const { container } = renderHarness({ root: "custom-root-xyz" });
    // The overridden part uses the custom class…
    expect(container.querySelector(".custom-root-xyz")).not.toBeNull();
    // …while non-overridden parts keep the shadcn preset.
    expect(container.querySelector(".border-collapse")).not.toBeNull();
  });

  it("exposes shadcnClassNames mapping AdaptTable parts to shadcn tokens", () => {
    expect(shadcnClassNames.root).toContain("bg-card");
    expect(shadcnClassNames.table).toContain("border-collapse");
    expect(Object.keys(shadcnClassNames).length).toBeGreaterThan(30);
  });

  it("density=compact tightens preset cells via the data-density root attr", () => {
    // The visual mechanism: the unstyled root carries data-density, and the
    // preset's cell classes react to it with ancestor-attribute variants.
    expect(shadcnClassNames.cell).toContain(
      "[[data-density=compact]_&]:py-1.5"
    );
    expect(shadcnClassNames.headerCell).toContain(
      "[[data-density=compact]_&]:py-1.5"
    );
    expect(shadcnClassNames.card).toContain("[[data-density=compact]_&]:p-2");
    const { container } = renderHarness(undefined, { density: "compact" });
    expect(
      container.querySelector('[data-adapttable-part="root"]')
    ).toHaveAttribute("data-density", "compact");
  });

  it("passes the error slot through to the shell", () => {
    adapter = createMemoryAdapter("");
    const { getByText, container } = render(<ErrorHarness />);

    expect(getByText(/mine: boom/)).toBeInTheDocument();
    expect(
      container.querySelector('[data-adapttable-part="error"]')
    ).toBeNull();
  });

  it("passes a custom card body through to the shell", () => {
    adapter = createMemoryAdapter("");
    const { getByText } = render(<CardHarness />);

    expect(getByText(/Ada · 1/)).toBeInTheDocument();
  });

  it("re-exports the panels, badge parts and all", () => {
    // This preset's panels ARE the unstyled ones — native markup with the
    // preset's classes — so the part names have to arrive with them rather
    // than being a gap in the one kit that ships no panel source of its own.
    const { container } = render(
      <SavedViewsPanel
        views={[
          {
            name: "Theirs",
            search: "t.q=x",
            visibility: "team",
            readOnly: true,
          },
          { name: "Mine", search: "t.q=a", isDefault: true },
        ]}
        onApply={() => undefined}
        onRename={() => undefined}
        onMove={() => undefined}
        onSetDefault={() => undefined}
        onRemove={() => undefined}
      />
    );

    expect(
      container.querySelector('[data-adapttable-part="saved-view-readonly"]')
    ).toHaveTextContent("Read-only");
    expect(
      container.querySelector('[data-adapttable-part="saved-view-default"]')
    ).toHaveTextContent("Default");
  });

  it("ships the saved-views panel pre-styled, like the table", () => {
    // One import, one look: a panel mounted beside a shadcn table carries the
    // preset without the app hand-wiring the class map.
    const { container } = render(
      <SavedViewsPanel
        views={[{ name: "Mine", search: "t.q=a" }]}
        onApply={() => undefined}
        onRename={() => undefined}
        onMove={() => undefined}
        onSetDefault={() => undefined}
        onRemove={() => undefined}
      />
    );

    expect(
      container.querySelector('[data-adapttable-part="saved-views-panel"]')
    ).toHaveClass(...shadcnClassNames.viewsPanel.split(" "));
    expect(
      container.querySelector('[data-adapttable-part="saved-view-row"]')
    ).toHaveClass(...shadcnClassNames.viewsRow.split(" "));
  });

  it("merges panel overrides over the preset, per part", () => {
    const { container } = render(
      <SavedViewsPanel
        views={[{ name: "Mine", search: "t.q=a" }]}
        onApply={() => undefined}
        onRename={() => undefined}
        onMove={() => undefined}
        onSetDefault={() => undefined}
        onRemove={() => undefined}
        classNames={{ viewsPanel: "custom-panel-xyz" }}
      />
    );

    const panel = container.querySelector(
      '[data-adapttable-part="saved-views-panel"]'
    );
    expect(panel).toHaveClass("custom-panel-xyz");
    // The part that was not overridden keeps the preset.
    expect(
      container.querySelector('[data-adapttable-part="saved-view-row"]')
    ).toHaveClass(...shadcnClassNames.viewsRow.split(" "));
  });
});
