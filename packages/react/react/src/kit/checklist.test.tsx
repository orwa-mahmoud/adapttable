import type { FilterDef } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { testPrimitives } from "../internal/testPrimitives";
import { createChecklistFilter } from "./checklist";

interface Row {
  team: string;
}

const DEF: FilterDef<Row> = { key: "team", type: "checklist", label: "Team" };
const ROWS: Row[] = [{ team: "Core" }, { team: "Core" }, { team: "Web" }];

const ChecklistFilter = createChecklistFilter(testPrimitives, {
  checkbox: { flex: "0 0 auto" },
});

function Harness() {
  const [extra, setExtra] = useState<Record<string, string[] | undefined>>({});
  return (
    <>
      <ChecklistFilter
        def={DEF}
        source={{
          allFilteredRows: ROWS,
          extra,
          setExtra: (key, value) =>
            setExtra((prev) => ({
              ...prev,
              [key]: Array.isArray(value) ? value : undefined,
            })),
        }}
      />
      <output>{(extra.team ?? []).join(",")}</output>
    </>
  );
}

const part = (name: string) =>
  document.querySelectorAll(`[data-adapttable-part="${name}"]`);

describe("createChecklistFilter", () => {
  it("draws each value as a labelled checkbox with its count", () => {
    render(<Harness />);
    const boxes = part("filter-checkbox");
    expect(boxes).toHaveLength(2);
    expect(boxes[0]?.tagName).toBe("LABEL");
    expect((boxes[0] as HTMLElement).style.flex).toBe("0 0 auto");
    expect(
      [...part("filter-checklist-count")].map((n) => n.textContent)
    ).toEqual(["(2)", "(1)"]);
    expect(part("filter-checklist-search")[0]?.tagName).toBe("INPUT");
  });

  it("checks a value, then selects every value", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Web/ }));
    expect(document.querySelector("output")?.textContent).toBe("Web");
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]!);
    expect(
      document.querySelector("output")?.textContent?.split(",").sort()
    ).toEqual(["Core", "Web"]);
  });
});
