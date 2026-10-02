/**
 * The MUI filter form's select field: its options, in the host's language.
 */
import {
  defaultLabels,
  type ExtraFilters,
  type FilterDef,
} from "@adapttable/core";
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderMui } from "../test-utils";
import { AutoFilterForm } from "./AutoFilterForm";

function renderForm(defs: readonly FilterDef[], extra: ExtraFilters = {}) {
  return renderMui(
    <AutoFilterForm
      defs={defs}
      labels={{ ...defaultLabels, filterAll: "Tous" }}
      source={{
        extra,
        setExtra: () => undefined,
        setExtras: () => undefined,
      }}
    />
  );
}

describe("<AutoFilterForm> select labels (MUI)", () => {
  it("offers the no-restriction option in the host's language", () => {
    renderForm([
      {
        key: "status",
        type: "select",
        options: [{ value: "active", label: "Active" }],
      },
    ]);
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Status" }));
    const listbox = screen.getByRole("listbox");
    expect(
      within(listbox)
        .getAllByRole("option")
        .map((option) => option.textContent)
    ).toEqual(["Tous", "Active"]);
  });
});

describe("<AutoFilterForm> field parts (MUI)", () => {
  it("marks each labelled field root without replacing its control parts", () => {
    const defs: FilterDef[] = [
      { key: "name", type: "text", label: "Name" },
      { key: "enabled", type: "boolean", label: "Enabled" },
      {
        key: "status",
        type: "select",
        label: "Status",
        options: [{ value: "active", label: "Active" }],
      },
      {
        key: "tags",
        type: "multiSelect",
        label: "Tags",
        options: [{ value: "urgent", label: "Urgent" }],
      },
      { key: "budget", type: "numberRange", label: "Budget" },
      { key: "created", type: "dateRange", label: "Created" },
    ];
    const { container } = renderForm(defs);
    const fields = container.querySelectorAll(
      '[data-adapttable-part="filter-field"]'
    );
    expect(fields).toHaveLength(defs.length);
    const fieldAt = (index: number) => {
      const field = fields[index];
      if (!field) throw new Error(`Missing filter field at index ${index}`);
      return field;
    };
    ["Name", "Enabled", "Status", "Tags", "Budget", "Created"].forEach(
      (label, index) => {
        const field = fieldAt(index);
        expect(field).toHaveTextContent(label);
        expect(field.querySelector("input, button, select")).not.toBeNull();
        expect(
          field.querySelector('[data-adapttable-part="filter-field"]')
        ).toBeNull();
      }
    );
    expect(
      fieldAt(0).querySelector('[data-adapttable-part="filter-input"]')
    ).toBeInTheDocument();
    ["Enabled", "Status"].forEach((name, index) => {
      const select = screen.getByRole("combobox", { name });
      expect(select).toHaveAttribute("data-adapttable-part", "filter-select");
      expect(select.closest('[data-adapttable-part="filter-field"]')).toBe(
        fieldAt(index + 1)
      );
    });
  });
});
