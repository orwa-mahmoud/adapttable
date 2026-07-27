import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";
import { renderAntd } from "./test-utils";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const columns: ColumnDef<Row>[] = [{ key: "name", accessor: (r) => r.name }];

function Harness({ animate }: { animate?: boolean }) {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: createMemoryAdapter(),
    columns,
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      animate={animate}
    />
  );
}

describe("Ant Design DataTable — animate", () => {
  afterEach(() => {
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  it("tags every row with data-stagger regardless of the animate flag", () => {
    const { container } = renderAntd(<Harness />);
    expect(container.querySelectorAll("[data-stagger]")).toHaveLength(
      ROWS.length
    );
  });

  it("runs the entrance stagger when animate is on", () => {
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    act(() => {
      renderAntd(<Harness animate />);
    });
    expect(animate).toHaveBeenCalledTimes(ROWS.length);
  });
});
