/**
 * Distribution guarantee: the chrome CSS actually ARRIVES for consumers —
 * rendering the table injects the stylesheet exactly once, without any
 * separate CSS import (the doc-claimed behavior).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createMemoryAdapter, useFrontendData } from "@adapttable/react";
import { defaultLabels } from "@adapttable/react/adapter";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FilterDrawer } from "./components/FilterDrawer";
import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import {
  ADAPTTABLE_BASE_UI_CSS,
  ADAPTTABLE_BASE_UI_DRAWER_CSS,
  ADAPTTABLE_BASE_UI_GROUPING_CSS,
} from "./injectStyles";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [{ id: "1", name: "Ada" }];
const columns: ColumnDef<Row>[] = [{ key: "name" }];

function Harness() {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: createMemoryAdapter(""),
    columns,
  });
  return <DataTable source={source} columns={columns} rowKey={(r) => r.id} />;
}

describe("base-ui chrome styles", () => {
  it("rendering the table injects the stylesheet once", () => {
    render(<Harness />);
    const styles = document.head.querySelectorAll(
      "style[data-adapttable-base-ui]"
    );
    expect(styles).toHaveLength(1);
    expect(styles[0]!.textContent).toContain(".adapttable-base-ui");

    // A second table never duplicates the sheet.
    render(<Harness />);
    expect(
      document.head.querySelectorAll("style[data-adapttable-base-ui]")
    ).toHaveLength(1);
  });

  it("injected chrome matches styles.css without comments", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "styles.css"),
      "utf8"
    );
    const rules = css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/ ?([{};,>]) ?/g, "$1")
      .trim();
    const start = rules.indexOf(".adapttable-drawer-backdrop{");
    const end = rules.indexOf(
      '.adapttable-btn[data-slot="select-trigger"]',
      start
    );
    const grouping = rules.indexOf(".adapttable-grouping-panel{", end);
    expect(ADAPTTABLE_BASE_UI_CSS).toBe(
      rules.slice(0, start) + rules.slice(end, grouping)
    );
    expect(ADAPTTABLE_BASE_UI_DRAWER_CSS).toBe(rules.slice(start, end));
    expect(ADAPTTABLE_BASE_UI_GROUPING_CSS).toBe(rules.slice(grouping));
    expect(
      ADAPTTABLE_BASE_UI_GROUPING_CSS.startsWith(".adapttable-grouping-panel{")
    ).toBe(true);
  });

  it("a plain table carries no grouping-strip rules", () => {
    render(<Harness />);
    expect(
      document.head.querySelector("style[data-adapttable-base-ui-grouping]")
    ).toBeNull();
    expect(
      document.head.querySelector("style[data-adapttable-base-ui]")?.textContent
    ).not.toContain(".adapttable-grouping-panel");
  });

  it("a plain table carries no optional drawer motion rules", () => {
    render(<Harness />);
    expect(
      document.head.querySelector("style[data-adapttable-base-ui-drawer]")
    ).toBeNull();
    expect(
      document.head.querySelector("style[data-adapttable-base-ui]")?.textContent
    ).not.toContain(".adapttable-drawer-backdrop{");
  });

  it("rendering the native drawer injects its motion rules once", () => {
    const props = {
      open: true,
      onClose: vi.fn(),
      filters: <div>Filters</div>,
      activeFilterCount: 0,
      onClearFilters: vi.fn(),
      labels: defaultLabels,
    };
    render(<FilterDrawer {...props} />);
    render(<FilterDrawer {...props} />);
    const styles = document.head.querySelectorAll(
      "style[data-adapttable-base-ui-drawer]"
    );
    expect(styles).toHaveLength(1);
    expect(styles[0]!.textContent).toContain(".adapttable-drawer-backdrop{");
    expect(styles[0]!.textContent).toContain("--drawer-swipe-movement-x");
  });
});
