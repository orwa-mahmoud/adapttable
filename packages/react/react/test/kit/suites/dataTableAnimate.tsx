import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import {
  type ColumnDef,
  createMemoryAdapter,
  useFrontendData,
} from "@adapttable/react";
import { act } from "@testing-library/react";
import { expect, vi } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `DataTable.animate.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function dataTableAnimateTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { DataTable, render } = kit;
  return collectConformanceTests(({ describe, it, afterEach }) => {
    interface Row {
      id: string;
      name: string;
    }
    const ROWS: Row[] = [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ];
    const columns: ColumnDef<Row>[] = [
      { key: "name", accessor: (r) => r.name },
    ];

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

    describe(`${kit.name} DataTable — animate`, () => {
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
  });
}
