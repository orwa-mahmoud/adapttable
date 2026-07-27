import type { ColumnDef } from "@adapttable/core";
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable, shadcnClassNames } from "./index";

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
  classNames?: Parameters<typeof DataTable<Row>>[0]["classNames"];
  density?: "comfortable" | "compact";
}) {
  const source = useFrontendData<Row>({ data: ROWS, adapter, columns });
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
});
