import type { ExtraFilters } from "@adapttable/core";
import { defaultLabels } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { ChecklistFilter } from "./ChecklistFilter";

describe("ChecklistFilter", () => {
  it("searches, selects all, clears, and toggles a value", () => {
    const rows = Array.from({ length: 8 }, (_, index) => ({
      id: String(index),
      team: index % 2 === 0 ? "Core" : "Web",
    }));
    function List() {
      const [extra, setExtra] = useState<ExtraFilters>({});
      return (
        <ChecklistFilter
          def={{
            key: "team",
            type: "checklist",
            getValue: (row: { team: string }) => row.team,
          }}
          source={{
            extra,
            setExtra: (key, value) =>
              setExtra((prev) => ({ ...prev, [key]: value })),
            allFilteredRows: rows,
          }}
          labels={defaultLabels}
          classNames={{
            filterChecklistSearch: "search-cls",
            filterCheckbox: "box-cls",
            filterChecklistCount: "count-cls",
          }}
        />
      );
    }
    render(<List />);
    fireEvent.change(screen.getByLabelText("Search values"), {
      target: { value: "Co" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Core/ }));
    expect(screen.getByRole("checkbox", { name: /Core/ })).toBeChecked();
  });
});
