import { createMemoryAdapter, useFrontendData } from "@adapttable/react";
import {
  ChakraProvider,
  defaultSystem,
  LocaleProvider,
} from "@chakra-ui/react";
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

function Harness({
  dir,
  labels,
}: {
  dir?: "ltr" | "rtl";
  labels?: { rowsPerPage?: string };
}) {
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
      labels={labels}
    />
  );
}

function shell(children: ReactNode, locale?: string): ReactNode {
  const table = locale ? (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  ) : (
    children
  );
  return <ChakraProvider value={defaultSystem}>{table}</ChakraProvider>;
}

function rootDir(container: ParentNode): string | null {
  return (
    container
      .querySelector('[data-adapttable-part="root"]')
      ?.getAttribute("dir") ?? null
  );
}

describe("Chakra library settings", () => {
  it("follows an Arabic LocaleProvider on the server and in the browser", () => {
    const html = renderToString(shell(<Harness />, "ar-EG"));
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("صفوف لكل صفحة");

    const { container } = render(shell(<Harness />, "ar-EG"));
    expect(rootDir(container)).toBe("rtl");
    expect(container).toHaveTextContent("صفوف لكل صفحة");
  });

  it("lets an explicit dir and labels win over the provider", () => {
    const { container } = render(
      shell(<Harness dir="ltr" labels={{ rowsPerPage: "Per page" }} />, "ar-EG")
    );
    expect(rootDir(container)).toBe("ltr");
    expect(container).toHaveTextContent("Per page");
    expect(container).not.toHaveTextContent("صفوف لكل صفحة");
  });

  it("keeps the current labels when i18n has no preset for the locale", () => {
    const { container } = render(shell(<Harness />, "sv-SE"));
    expect(container).toHaveTextContent("Rows per page");
    expect(container).not.toHaveTextContent("صفوف لكل صفحة");
  });

  it("leaves the default locale to the page", () => {
    const { container } = render(shell(<Harness />));
    expect(rootDir(container)).toBeNull();
    expect(container).toHaveTextContent("Rows per page");
  });
});
