import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

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
    <ChakraProvider value={defaultSystem}>
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        animate={animate}
      />
    </ChakraProvider>
  );
}

describe("Chakra DataTable — animate", () => {
  afterEach(() => {
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  it("tags every row with data-stagger regardless of the animate flag", () => {
    const { container } = render(<Harness />);
    expect(container.querySelectorAll("[data-stagger]")).toHaveLength(
      ROWS.length
    );
  });

  it("runs the entrance stagger when animate is on", () => {
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    act(() => {
      render(<Harness animate />);
    });
    expect(animate).toHaveBeenCalledTimes(ROWS.length);
  });
});
