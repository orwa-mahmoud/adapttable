import { createMemoryAdapter, useFrontendData } from "@adapttable/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
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

function shell(children: ReactNode, direction?: "rtl"): ReactNode {
  const theme = createTheme(direction ? { direction } : {});
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

function rootDir(container: ParentNode): string | null {
  return (
    container
      .querySelector('[data-adapttable-part="root"]')
      ?.getAttribute("dir") ?? null
  );
}

describe("MUI library settings", () => {
  it("follows theme.direction rtl on the server and in the browser", () => {
    const html = renderToString(shell(<Harness />, "rtl"));
    expect(html).toContain('dir="rtl"');

    const { container } = render(shell(<Harness />, "rtl"));
    expect(rootDir(container)).toBe("rtl");
  });

  it("lets an explicit dir win over the theme", () => {
    const { container } = render(shell(<Harness dir="ltr" />, "rtl"));
    expect(rootDir(container)).toBe("ltr");
  });

  it("leaves a default left-to-right theme to the page", () => {
    const { container } = render(shell(<Harness />));
    expect(rootDir(container)).toBeNull();
  });
});
