import { slotRender } from "@adapttable/core/binding";
import { expect, it, vi } from "vitest";
import { createApp, nextTick } from "vue";

import { CONTEXT_MENU_CONTROL, CONTEXT_MENU_MODEL } from "../src/actions/contracts";
import { contextMenu } from "../src/context-menu";
import type { TableFeature } from "../src/features/tableFeature";
import { useDataTableShell } from "../src/useDataTableShell";

interface Row {
  id: string;
  name: string;
}

function menuSlot(): TableFeature<Row> {
  return {
    id: "context-menu-slot",
    renders: [slotRender(CONTEXT_MENU_CONTROL, () => null)],
  };
}

it("opens a context menu without re-entering the shell frame", async () => {
  const host = document.createElement("div");
  host.innerHTML =
    '<div data-adapttable-part="row" data-row-id="a"><span data-adapttable-part="cell" data-column-key="name">Ada</span></div>';
  host.setAttribute("data-adapttable-part", "root");
  document.body.append(host);
  let shell: ReturnType<typeof useDataTableShell<Row>> | undefined;
  const app = createApp({
    setup() {
      shell = useDataTableShell({
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        features: [contextMenu<Row>(), menuSlot()],
      });
      shell.setSurface({
        rootElement: () => host,
        scrollElement: () => host,
      });
      return () => null;
    },
  });
  const mountPoint = document.createElement("div");
  document.body.append(mountPoint);
  app.mount(mountPoint);
  await nextTick();
  host.querySelector("[data-column-key=name]")?.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 4,
      clientY: 6,
    })
  );
  await nextTick();
  expect(shell).toBeDefined();
  const view = shell?.runtime.view();
  const model = shell?.state.get(CONTEXT_MENU_MODEL).value;
  expect(view?.contextMenu?.entries?.length ?? 0).toBeGreaterThan(0);
  expect(model?.items.length).toBeGreaterThan(0);
  expect(model?.items.some((item) => item.label.length > 0)).toBe(true);
  app.unmount();
  host.remove();
  mountPoint.remove();
});

it("runs header and cell menu actions while the menu is open", async () => {
  const host = document.createElement("div");
  host.innerHTML =
    '<div data-adapttable-part="header-cell" data-column-key="name">Name</div><div data-adapttable-part="row" data-row-id="a"><span data-adapttable-part="cell" data-column-key="name">Ada</span></div>';
  host.setAttribute("data-adapttable-part", "root");
  document.body.append(host);
  const onFilter = vi.fn();
  let shell: ReturnType<typeof useDataTableShell<Row>> | undefined;
  const app = createApp({
    setup() {
      shell = useDataTableShell({
        data: [{ id: "a", name: "Ada" }],
        columns: [
          {
            key: "name",
            sortable: true,
            filter: true,
            accessor: (row: Row) => row.name,
          },
        ],
        rowKey: (row) => row.id,
        features: [contextMenu<Row>({ onFilter }), menuSlot()],
      });
      shell.setSurface({
        rootElement: () => host,
        scrollElement: () => host,
      });
      return () => null;
    },
  });
  const mountPoint = document.createElement("div");
  document.body.append(mountPoint);
  app.mount(mountPoint);
  await nextTick();
  const open = (selector: string) => {
    host.querySelector(selector)?.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 4,
        clientY: 6,
      })
    );
  };
  open('[data-adapttable-part="cell"]');
  await nextTick();
  for (const item of shell?.state.get(CONTEXT_MENU_MODEL).value?.items ?? []) {
    item.onSelect();
  }
  open('[data-adapttable-part="header-cell"]');
  await nextTick();
  const headerItems = shell?.state.get(CONTEXT_MENU_MODEL).value?.items ?? [];
  expect(headerItems.map((item) => item.key)).toEqual(
    expect.arrayContaining(["sort-asc", "filter", "pin", "hide"])
  );
  for (const item of headerItems) item.onSelect();
  expect(onFilter).toHaveBeenCalledWith("name");
  app.unmount();
  host.remove();
  mountPoint.remove();
});
