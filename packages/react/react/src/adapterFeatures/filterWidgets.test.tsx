import { defaultFilterRegistry, type FilterTypeSpec } from "@adapttable/core";
import { defaultLabels, withFilterType } from "@adapttable/core/binding";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type FilterWidget,
  FilterWidgetField,
  type FilterWidgetProps,
} from "./filterWidgets";

const source = {
  extra: {},
  setExtra: vi.fn(),
  setExtras: vi.fn(),
  allFilteredRows: [],
};
const labels = defaultLabels;

function TextField({ def }: FilterWidgetProps) {
  return <span>text {def.key}</span>;
}
const text: FilterWidget = { kinds: ["text"], render: TextField };

describe("FilterWidgetField", () => {
  it("draws the widget composed for the definition's kind", () => {
    render(
      <FilterWidgetField
        field={{ def: { key: "name", type: "text" }, source, labels }}
        registry={defaultFilterRegistry}
        widgets={[text]}
      />
    );
    expect(screen.getByText("text name")).toBeInTheDocument();
  });

  it("draws a registered render before any widget", () => {
    const custom: FilterTypeSpec = {
      ...defaultFilterRegistry.get("text")!,
      type: "custom",
      render: ({ def }) => <b>custom {def.key}</b>,
    };
    render(
      <FilterWidgetField
        field={{ def: { key: "name", type: "custom" }, source, labels }}
        registry={withFilterType(defaultFilterRegistry, custom)}
        widgets={[]}
      />
    );
    expect(screen.getByText("custom name")).toBeInTheDocument();
  });

  it("draws nothing for a type that names no widget", () => {
    const { container } = render(
      <FilterWidgetField
        field={{ def: { key: "name", type: "unknown" }, source, labels }}
        registry={defaultFilterRegistry}
        widgets={[text]}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("names the widget a composed form lacks", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      render(
        <FilterWidgetField
          field={{ def: { key: "status", type: "select" }, source, labels }}
          registry={defaultFilterRegistry}
          widgets={[text]}
        />
      )
    ).toThrow('draws the "select" widget');
    vi.mocked(console.error).mockRestore();
  });
});
