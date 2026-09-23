import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import { grouping } from "./grouping";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  team: string;
  teamAr: string;
}
const ROWS: Row[] = [
  { id: "1", team: "Core", teamAr: "النواة" },
  { id: "2", team: "Web", teamAr: "الويب" },
  { id: "3", team: "Core", teamAr: "النواة" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "team", header: "Team", i18n: { ar: "teamAr" } },
];

/** Group headers in document order, as plain text. */
const headers = () =>
  [...document.querySelectorAll('[data-adapttable-part="group-row"]')].map(
    (el) => el.textContent?.replace(/\s+/g, " ").trim() ?? ""
  );

describe("grouping by a translated column (unstyled)", () => {
  const table = (locale?: string) =>
    render(
      <DataTable<Row>
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        locale={locale}
        features={[grouping("team")]}
      />
    );

  it("groups by the column's path for the active locale", () => {
    table("ar");
    const labels = headers();
    expect(labels).toHaveLength(2);
    expect(labels[0]).toContain("النواة");
    expect(labels[1]).toContain("الويب");
    expect(labels.join(" ")).not.toContain("Core");
  });

  it("groups by the column key without a locale", () => {
    table();
    const labels = headers();
    expect(labels[0]).toContain("Core");
    expect(labels[1]).toContain("Web");
  });
});
