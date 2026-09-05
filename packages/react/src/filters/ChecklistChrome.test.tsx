import { fireEvent, render, screen } from "@testing-library/react";
import { type ChangeEvent, useState } from "react";
import { describe, expect, it } from "vitest";

import { CHECKLIST_VIRTUALIZE_AT } from "./checklist";
import { ChecklistChrome, type ChecklistSlots } from "./ChecklistChrome";
import type { FilterDef } from "@adapttable/core";

interface Row {
  team: string;
}

const DEF: FilterDef<Row> = { key: "team", type: "checklist", label: "Team" };

const ROWS: Row[] = [{ team: "Core" }, { team: "Core" }, { team: "Web" }];

const slots: ChecklistSlots = {
  Search: ({ label, value, className, onChange }) => (
    <input
      type="search"
      aria-label={label}
      placeholder={label}
      data-adapttable-part="filter-checklist-search"
      className={className}
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange(event.target.value)
      }
    />
  ),
  Button: ({ label, onClick }) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
  Checkbox: ({
    label,
    count,
    checked,
    className,
    countClassName,
    onChange,
  }) => (
    <label
      data-adapttable-part="filter-checkbox"
      className={className}
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.checked)
        }
      />{" "}
      {label}{" "}
      <span
        data-adapttable-part="filter-checklist-count"
        className={countClassName}
      >
        {count}
      </span>
    </label>
  ),
};

/** `count` distinct team values, zero-padded so ordering is lexical. */
function teams(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    team: `Team ${String(i).padStart(3, "0")}`,
  }));
}

function listElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    '[data-adapttable-part="filter-checklist-list"]'
  );
}

/**
 * jsdom has no layout, so the scroll position is defined onto the element the
 * way the antd virtual-holder tests do it — a plain assignment reads back as 0.
 */
function scrollTo(list: HTMLElement, scrollTop: number): void {
  Object.defineProperty(list, "scrollTop", {
    get: () => scrollTop,
    set: () => undefined,
    configurable: true,
  });
  fireEvent.scroll(list);
}

function Harness({ rows = ROWS }: Readonly<{ rows?: readonly Row[] | null }>) {
  const [extra, setExtra] = useState<Record<string, string[] | undefined>>({});
  return (
    <ChecklistChrome
      def={DEF}
      source={{
        allFilteredRows: rows ?? undefined,
        extra,
        setExtra: (key, value) =>
          setExtra((prev) => ({
            ...prev,
            [key]: Array.isArray(value) ? value : undefined,
          })),
      }}
      slots={slots}
    />
  );
}

describe("ChecklistChrome", () => {
  it("hides when the source has no full filtered set", () => {
    render(<Harness rows={null} />);
    expect(screen.queryByText("Team")).toBeNull();
  });

  it("renders from facets when the page has no allFilteredRows", () => {
    function FacetHarness() {
      return (
        <ChecklistChrome
          def={DEF}
          source={{
            extra: {},
            setExtra: () => undefined,
            facets: {
              team: [
                { value: "Core", label: "Core", count: 2 },
                { value: "Web", label: "Web", count: 4 },
              ],
            },
          }}
          slots={slots}
        />
      );
    }
    render(<FacetHarness />);
    expect(screen.getByRole("checkbox", { name: /Web/ })).toBeInTheDocument();
    expect(screen.getByText("(4)")).toBeInTheDocument();
  });

  it("searches, checks one value, and writes the bag", () => {
    render(<Harness />);
    expect(screen.getByText("(2)")).toBeInTheDocument();
    expect(screen.getByText("(1)")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search values"), {
      target: { value: "web" },
    });
    expect(screen.queryByRole("checkbox", { name: /Core/ })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: /Web/ }));
    expect(screen.getByRole("checkbox", { name: /Web/ })).toBeChecked();
  });

  it("select-all and clear drive the visible set", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(screen.getByRole("checkbox", { name: /Core/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Web/ })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByRole("checkbox", { name: /Core/ })).not.toBeChecked();
  });

  it("wraps a short list instead of stacking one value per row", () => {
    const rows = teams(CHECKLIST_VIRTUALIZE_AT - 5);
    render(<Harness rows={rows} />);
    const list = listElement();
    expect(list).toHaveAttribute("data-virtualized", "false");
    expect(list).toHaveStyle({ flexWrap: "wrap" });
    // Under the threshold nothing is windowed: every value is mounted.
    expect(screen.getAllByRole("checkbox")).toHaveLength(rows.length);
    expect(
      screen.getByRole("checkbox", { name: /Team 000/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Team 034/ })
    ).toBeInTheDocument();
  });

  it("windows a long list rather than mounting every checkbox", () => {
    render(<Harness rows={teams(200)} />);
    const list = listElement();
    expect(list).toHaveAttribute("data-virtualized", "true");
    expect(list).toHaveStyle({ flexWrap: "wrap" });
    expect(screen.getAllByRole("checkbox").length).toBeLessThan(
      CHECKLIST_VIRTUALIZE_AT
    );
    expect(
      screen.getByRole("checkbox", { name: /Team 000/ })
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Team 199/ })).toBeNull();
  });

  it("mounts a different slice once the list is scrolled", () => {
    render(<Harness rows={teams(200)} />);
    const list = listElement()!;
    expect(
      screen.getByRole("checkbox", { name: /Team 000/ })
    ).toBeInTheDocument();

    scrollTo(list, 2000);

    expect(screen.queryByRole("checkbox", { name: /Team 000/ })).toBeNull();
    expect(
      screen.getByRole("checkbox", { name: /Team 055/ })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox").length).toBeLessThan(
      CHECKLIST_VIRTUALIZE_AT
    );
  });

  it("keeps the whole list scrollable while windowed", () => {
    render(<Harness rows={teams(200)} />);
    const list = listElement()!;
    const spacers = [...list.children].filter((child) =>
      child.getAttribute("style")?.includes("flex-basis: 100%")
    );
    // One spacer below at rest; scrolling adds the one above.
    expect(spacers).toHaveLength(1);
    scrollTo(list, 2000);
    expect(
      [...list.children].filter((child) =>
        child.getAttribute("style")?.includes("flex-basis: 100%")
      )
    ).toHaveLength(2);
  });

  it("searching down to a short set stops windowing", () => {
    render(<Harness rows={teams(200)} />);
    expect(listElement()).toHaveAttribute("data-virtualized", "true");
    fireEvent.change(screen.getByLabelText("Search values"), {
      target: { value: "Team 01" },
    });
    // "Team 010".."Team 019" — ten matches, under the threshold.
    expect(listElement()).toHaveAttribute("data-virtualized", "false");
    expect(screen.getAllByRole("checkbox")).toHaveLength(10);
  });
});
