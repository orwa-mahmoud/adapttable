import { createMemoryAdapter, useFrontendData } from "@adapttable/react";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
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

function Harness({ dir }: { dir?: "ltr" | "rtl" }) {
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
      dir={dir}
    />
  );
}

function shell(children: ReactNode, direction?: "ltr" | "rtl"): ReactNode {
  return direction ? (
    <DirectionProvider direction={direction}>{children}</DirectionProvider>
  ) : (
    <>{children}</>
  );
}

function rootDir(container: ParentNode): string | null {
  return (
    container
      .querySelector('[data-adapttable-part="root"]')
      ?.getAttribute("dir") ?? null
  );
}

describe("Base UI library settings", () => {
  it("follows DirectionProvider on the server and in the browser", () => {
    const html = renderToString(shell(<Harness />, "rtl"));
    expect(html).toContain('dir="rtl"');

    const { container } = render(shell(<Harness />, "rtl"));
    expect(rootDir(container)).toBe("rtl");
  });

  it("lets an explicit dir win, and an explicit ltr provider beats the page", () => {
    const { container: explicit } = render(shell(<Harness dir="ltr" />, "rtl"));
    expect(rootDir(explicit)).toBe("ltr");

    const { container: provider } = render(shell(<Harness />, "ltr"));
    expect(rootDir(provider)).toBe("ltr");
  });

  it("leaves direction to the page when no DirectionProvider is mounted", () => {
    const { container } = render(shell(<Harness />));
    expect(rootDir(container)).toBeNull();
  });
});
