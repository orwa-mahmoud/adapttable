import { defaultLabels } from "@adapttable/core";
import { type HeaderGroupCell } from "@adapttable/core/binding";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { columnGroupTestSlots } from "../internal/chromeTestSlots";
import { ColumnGroupToggleChrome } from "./ColumnGroupToggle";

const cell = (over: Partial<HeaderGroupCell> = {}): HeaderGroupCell => ({
  key: "g",
  label: "People",
  span: 2,
  id: "People",
  collapsed: false,
  collapsible: true,
  hideLabel: false,
  ...over,
});

describe("ColumnGroupToggle", () => {
  it("renders nothing useful until the cell is collapsible", () => {
    const { container } = render(
      <ColumnGroupToggleChrome
        slots={columnGroupTestSlots}
        cell={cell({ collapsible: false })}
        labels={defaultLabels}
        onToggle={vi.fn()}
      />
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("toggles the group and names the control from the labels", () => {
    const onToggle = vi.fn();
    render(
      <ColumnGroupToggleChrome
        slots={columnGroupTestSlots}
        cell={cell()}
        labels={defaultLabels}
        onToggle={onToggle}
      />
    );
    const button = screen.getByRole("button", {
      name: `${defaultLabels.collapseColumnGroup}: People`,
    });
    expect(button).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith("People");
  });

  it("names the stub from the accessible label, without a hover tooltip", () => {
    render(
      <ColumnGroupToggleChrome
        slots={columnGroupTestSlots}
        cell={cell({ hideLabel: true, collapsed: true })}
        labels={defaultLabels}
        onToggle={vi.fn()}
      />
    );
    expect(
      screen.getByRole("button", {
        name: `${defaultLabels.expandColumnGroup}: People`,
      })
    ).not.toHaveAttribute("title");
  });
});
