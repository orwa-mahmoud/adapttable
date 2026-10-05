import { expect, it } from "vitest";
import { defineComponent, h, KeepAlive, shallowRef } from "vue";

import { DataTable } from "../src";
import { find, mountNative, part, tick } from "./filter-editing-helpers";

it("retires retained native selection controls while a table is suspended and after disposal", async () => {
  const shown = shallowRef(true);
  const selected = shallowRef<readonly string[]>([]);
  const accept = shallowRef(true);
  const requests: string[][] = [];
  const Table = defineComponent(
    () => () =>
      h(DataTable<{ id: string }>, {
        data: [{ id: "first" }, { id: "second" }],
        columns: [{ key: "id" }],
        rowKey: (row) => row.id,
        selectable: true,
        forceMobile: false,
        selectedIds: selected.value,
        "onUpdate:selectedIds": (ids) => {
          requests.push(ids);
          if (accept.value) selected.value = ids;
        },
        urlSync: false,
      })
  );
  const view = mountNative(() =>
    h(KeepAlive, null, { default: () => (shown.value ? h(Table) : null) })
  );
  await tick();
  const first = find<HTMLInputElement>(
    view.host,
    `[data-row-id="first"] ${part("checkbox")}`
  );
  const all = find<HTMLInputElement>(view.host, `thead ${part("checkbox")}`);
  first.click();
  await tick();
  expect(selected.value).toEqual(["first"]);
  expect(requests).toHaveLength(1);
  shown.value = false;
  await tick();
  first.dispatchEvent(new Event("change", { bubbles: true }));
  all.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
  expect(requests).toHaveLength(1);
  expect(selected.value).toEqual(["first"]);
  shown.value = true;
  await tick();
  const live = find<HTMLInputElement>(
    view.host,
    `[data-row-id="first"] ${part("checkbox")}`
  );
  accept.value = false;
  live.click();
  await tick();
  expect(requests).toHaveLength(2);
  expect(selected.value).toEqual(["first"]);
  expect(live.checked).toBe(true);
  accept.value = true;
  live.click();
  await tick();
  expect(requests).toHaveLength(3);
  expect(selected.value).toEqual([]);
  view.stop();
  live.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
  expect(requests).toHaveLength(3);
});

it("retires removed row controls and lets the current header select a replacement source", async () => {
  const data = shallowRef([{ id: "first" }, { id: "second" }]);
  const requests: string[][] = [];
  const view = mountNative(() =>
    h(DataTable<{ id: string }>, {
      data: data.value,
      columns: [{ key: "id" }],
      rowKey: (row) => row.id,
      selectable: true,
      forceMobile: false,
      "onUpdate:selectedIds": (ids) => requests.push(ids),
      urlSync: false,
    })
  );
  await tick();
  const oldRow = find<HTMLInputElement>(
    view.host,
    `[data-row-id="first"] ${part("checkbox")}`
  );
  data.value = [{ id: "third" }, { id: "fourth" }];
  await tick();
  oldRow.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
  expect(requests).toEqual([]);
  find<HTMLInputElement>(
    view.host,
    `[data-row-id="third"] ${part("checkbox")}`
  ).click();
  await tick();
  expect(requests).toEqual([["third"]]);
  find<HTMLInputElement>(view.host, `thead ${part("checkbox")}`).click();
  await tick();
  expect(requests).toEqual([["third"], ["third", "fourth"]]);
});

it("does not mutate retained selection state while its controls are unavailable", async () => {
  const enabled = shallowRef(true);
  const requests: string[][] = [];
  const data = [{ id: "first" }, { id: "second" }];
  const view = mountNative(() =>
    h(DataTable<{ id: string }>, {
      data,
      columns: [{ key: "id" }],
      rowKey: (row) => row.id,
      selectable: enabled.value,
      forceMobile: false,
      "onUpdate:selectedIds": (ids) => requests.push(ids),
      urlSync: false,
    })
  );
  await tick();
  const row = find<HTMLInputElement>(
    view.host,
    `[data-row-id="first"] ${part("checkbox")}`
  );
  const header = find<HTMLInputElement>(view.host, `thead ${part("checkbox")}`);
  enabled.value = false;
  await tick();
  expect(view.host.querySelector(part("checkbox"))).toBeNull();
  row.dispatchEvent(new Event("change", { bubbles: true }));
  header.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
  expect(requests).toEqual([]);
  enabled.value = true;
  await tick();
  expect(
    find<HTMLInputElement>(
      view.host,
      `[data-row-id="first"] ${part("checkbox")}`
    ).checked
  ).toBe(false);
  expect(
    find<HTMLInputElement>(view.host, `thead ${part("checkbox")}`).checked
  ).toBe(false);
  find<HTMLInputElement>(
    view.host,
    `[data-row-id="second"] ${part("checkbox")}`
  ).click();
  await tick();
  expect(requests).toEqual([["second"]]);
});
