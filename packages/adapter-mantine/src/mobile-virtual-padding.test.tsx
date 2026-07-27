/**
 * Covers MobileCards' trailing virtual-spacer branch (`paddingBottom > 0`).
 * We mock `useChromeBodyData` to return a non-zero `paddingBottom`, which
 * is only rendered in the virtualized mobile layout.
 */
import {
  createMemoryAdapter,
  useChromeBodyData,
  useFrontendData,
} from "@adapttable/core";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

vi.mock("@adapttable/core", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useChromeBodyData: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(useChromeBodyData).mockImplementation((_chrome, props) => ({
    virtualization: {
      enabled: true,
      rows: props.source.rows.map((row, index) => ({
        row,
        index,
        key: props.rowKey(row),
      })),
      paddingTop: 0,
      // Non-zero trailing padding renders the bottom spacer div.
      paddingBottom: 40,
    },
    loadMoreRef: { current: null },
    canLoadMore: true,
    virtualScrollRef: () => undefined,
  }));
});

const adapter = createMemoryAdapter("");

function Harness() {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: adapter,
    columns,
    paginationMode: "infinite",
  });
  return (
    <MantineProvider>
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        isMobile
        virtualize
      />
    </MantineProvider>
  );
}

describe("MobileCards trailing virtual spacer", () => {
  it("renders a bottom spacer when paddingBottom > 0", () => {
    const { container } = render(<Harness />);
    const spacers = container.querySelectorAll("div[aria-hidden][style]");
    const hasBottomSpacer = Array.from(spacers).some(
      (el) => (el as HTMLElement).style.height === "40px"
    );
    expect(hasBottomSpacer).toBe(true);
  });
});
