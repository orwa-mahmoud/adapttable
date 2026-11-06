import { createMemoryAdapter, useFrontendData } from "@adapttable/react";
import { DirectionProvider, MantineProvider } from "@mantine/core";
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
  const table = direction ? (
    <DirectionProvider initialDirection={direction} detectDirection={false}>
      {children}
    </DirectionProvider>
  ) : (
    children
  );
  return <MantineProvider env="test">{table}</MantineProvider>;
}

function rootDir(container: ParentNode): string | null {
  return (
    container
      .querySelector('[data-adapttable-part="root"]')
      ?.getAttribute("dir") ?? null
  );
}

describe("Mantine library settings", () => {
  it("follows DirectionProvider on the server and in the browser", () => {
    const html = renderToString(shell(<Harness />, "rtl"));
    expect(html).toContain('dir="rtl"');

    const { container } = render(shell(<Harness />, "rtl"));
    expect(rootDir(container)).toBe("rtl");
  });

  it("lets an explicit dir win over DirectionProvider", () => {
    const { container } = render(shell(<Harness dir="ltr" />, "rtl"));
    expect(rootDir(container)).toBe("ltr");
  });

  it("leaves direction to the page when no DirectionProvider is mounted", () => {
    const { container } = render(shell(<Harness />));
    expect(rootDir(container)).toBeNull();
  });
});
