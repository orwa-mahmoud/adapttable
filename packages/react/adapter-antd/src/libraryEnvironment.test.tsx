import { createMemoryAdapter, useFrontendData } from "@adapttable/react";
import { act, render } from "@testing-library/react";
import { ConfigProvider } from "antd";
import arEG from "antd/locale/ar_EG";
import svSE from "antd/locale/sv_SE";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

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

function Harness(props: {
  dir?: "ltr" | "rtl";
  labels?: { rowsPerPage?: string };
  size?: "small" | "middle" | "large";
  density?: "comfortable" | "compact";
  animate?: boolean;
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
      {...props}
    />
  );
}

function rootDir(container: ParentNode): string | null {
  return (
    container
      .querySelector('[data-adapttable-part="root"]')
      ?.getAttribute("dir") ?? null
  );
}

describe("Ant Design library settings", () => {
  afterEach(() => {
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  it("follows ConfigProvider direction on the server and in the browser", () => {
    const html = renderToString(
      <ConfigProvider direction="rtl">
        <Harness />
      </ConfigProvider>
    );
    expect(html).toContain('data-adapttable-part="root"');
    expect(html).toContain('dir="rtl"');

    const { container } = render(
      <ConfigProvider direction="rtl">
        <Harness />
      </ConfigProvider>
    );
    expect(rootDir(container)).toBe("rtl");
  });

  it("lets an explicit dir win over ConfigProvider", () => {
    const { container } = render(
      <ConfigProvider direction="rtl">
        <Harness dir="ltr" />
      </ConfigProvider>
    );
    expect(rootDir(container)).toBe("ltr");
  });

  it("uses Arabic labels when the ConfigProvider locale is Arabic", async () => {
    const { container } = render(
      <ConfigProvider locale={arEG}>
        <Harness />
      </ConfigProvider>
    );
    await vi.waitFor(() => {
      expect(container).toHaveTextContent("صفوف لكل صفحة");
    });
  });

  it("keeps the current labels when i18n has no preset for the locale", () => {
    const { container } = render(
      <ConfigProvider locale={svSE}>
        <Harness />
      </ConfigProvider>
    );
    expect(container).toHaveTextContent("Rows per page");
    expect(container).not.toHaveTextContent("صفوف لكل صفحة");
  });

  it("lets explicit labels win over the ConfigProvider locale", () => {
    const { container } = render(
      <ConfigProvider locale={arEG}>
        <Harness labels={{ rowsPerPage: "Per page" }} />
      </ConfigProvider>
    );
    expect(container).toHaveTextContent("Per page");
    expect(container).not.toHaveTextContent("صفوف لكل صفحة");
  });

  it("maps componentSize small onto the compact table", () => {
    const { container } = render(
      <ConfigProvider componentSize="small">
        <Harness />
      </ConfigProvider>
    );
    expect(container.querySelector(".ant-table-small")).toBeInTheDocument();
  });

  it("lets an explicit size win over componentSize", () => {
    const { container } = render(
      <ConfigProvider componentSize="small">
        <Harness size="large" />
      </ConfigProvider>
    );
    expect(container.querySelector(".ant-table-small")).toBeNull();
    expect(container.querySelector(".ant-table-medium")).toBeNull();
  });

  it("lets an explicit density win over componentSize", () => {
    const { container } = render(
      <ConfigProvider componentSize="small">
        <Harness density="comfortable" />
      </ConfigProvider>
    );
    expect(container.querySelector(".ant-table-small")).toBeNull();
    expect(container.querySelector(".ant-table-medium")).toBeInTheDocument();
  });

  it("stops the entrance when the theme turns motion off", () => {
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    act(() => {
      render(
        <ConfigProvider theme={{ token: { motion: false } }}>
          <Harness animate />
        </ConfigProvider>
      );
    });
    expect(animate).not.toHaveBeenCalled();
  });
});
