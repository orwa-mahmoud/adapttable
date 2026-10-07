import { type ColumnDef, useFrontendData } from "@adapttable/vue";
import ui from "@nuxt/ui/vue-plugin";
import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import { DataTable, type DataTableProps } from "../src";
import { groupingPanel } from "../src/grouping-panel";

interface Row {
  id: string;
  name: string;
  team: string;
  score: number;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", team: "Core", score: 10 },
  { id: "b", name: "Bea", team: "Core", score: 20 },
  { id: "c", name: "Cal", team: "Ops", score: 30 },
];
const columns: readonly ColumnDef<Row>[] = [
  { key: "team", header: "Team" },
  { key: "name", header: "Name" },
  {
    key: "score",
    header: "Score",
    aggregatable: {
      default: "sum",
      operations: ["sum", "avg", "min", "max", "count"],
    },
    filter: { type: "number" },
  },
];
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const stop of cleanups.splice(0)) stop();
});
async function tick() {
  await Promise.resolve();
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
}
const part = (name: string) => '[data-adapttable-part="' + name + '"]';
function node<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  selector: string
): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error("Missing " + selector);
  return found;
}
function fixture(
  initial: readonly string[] = ["team"],
  extra: Partial<DataTableProps<Row>> = {}
) {
  const scope = effectScope();
  const source = scope.run(() =>
    useFrontendData<Row>({
      data: rows,
      columns,
      defaults: initial.length ? { groupBy: initial.join(",") } : undefined,
      urlSync: false,
    })
  );
  if (!source) throw new Error("Missing source");
  const accept = shallowRef(true);
  const acceptAggregates = shallowRef(true);
  const writableAggregates = shallowRef(true);
  const writeAggregates = vi.fn(
    (
      value: Parameters<
        NonNullable<typeof source.value.setGroupAggregateOverrides>
      >[0]
    ) => {
      if (acceptAggregates.value)
        source.value.setGroupAggregateOverrides?.(value);
    }
  );
  const notify = vi.fn<(keys: readonly string[]) => void>();
  const write = vi.fn((value: string | undefined) => {
    if (accept.value) source.value.setGroupBy(value);
  });
  const props = shallowRef<DataTableProps<Row>>({
    columns,
    rowKey: (row) => row.id,
    urlSync: false,
    searchable: false,
    forceMobile: false,
    features: [
      groupingPanel<Row>(undefined, {
        onGroupByChange: notify,
        groupFooters: true,
      }),
    ],
    ...extra,
  });
  const shown = shallowRef(true);
  const Table = defineComponent({
    setup: () => () =>
      h(DataTable<Row>, {
        ...props.value,
        source: {
          ...source.value,
          setGroupBy: write,
          setGroupAggregateOverrides: writableAggregates.value
            ? writeAggregates
            : undefined,
        },
      }),
  });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(KeepAlive, null, { default: () => (shown.value ? h(Table) : null) }),
  }).use(ui);
  cleanups.push(() => {
    app.unmount();
    scope.stop();
    host.remove();
  });
  app.mount(host);
  return {
    host,
    props,
    shown,
    source,
    accept,
    acceptAggregates,
    writableAggregates,
    writeAggregates,
    notify,
    write,
  };
}
function key(target: HTMLElement, value: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
}
async function choose(host: HTMLElement, name: string, text: string) {
  const trigger = node<HTMLButtonElement>(host, part(name));
  trigger.focus();
  key(trigger, "ArrowDown");
  await tick();
  const list = node(document, '[role="listbox"]');
  expect(node(host, part("grouping-panel")).contains(list)).toBe(false);
  const option = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((value) => value.textContent?.trim() === text);
  if (!option) throw new Error("Missing choice " + text);
  key(option, "Enter");
  await tick();
}
function transfer() {
  const data = new Map<string, string>();
  return {
    get types() {
      return [...data.keys()];
    },
    setData: (type: string, value: string) => {
      data.set(type, value);
    },
    getData: (type: string) => data.get(type) ?? "",
    effectAllowed: "none",
    dropEffect: "none",
    setDragImage: () => undefined,
  };
}
function drag(
  target: HTMLElement,
  type: string,
  data: ReturnType<typeof transfer>
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: data });
  target.dispatchEvent(event);
}
it("uses genuine native selects and buttons over one grouping model", async () => {
  const f = fixture(["team"], {
    classNames: {
      groupingPanel: "panel-paint",
      groupingChipHandle: "handle-paint",
      groupingAdd: "add-paint",
    },
  });
  await tick();
  const panel = node(f.host, part("grouping-panel"));
  expect(panel.tagName).toBe("SECTION");
  expect(panel.getAttribute("role")).toBe("group");
  expect(panel.classList.contains("panel-paint")).toBe(true);
  expect(panel.querySelector('[data-slot="body"]')).not.toBeNull();
  const handle = node<HTMLButtonElement>(f.host, part("grouping-chip-handle"));
  expect(handle.getAttribute("data-slot")).toBe("base");
  expect(handle.classList.contains("handle-paint")).toBe(true);
  const add = node<HTMLButtonElement>(f.host, part("grouping-add"));
  expect(add.getAttribute("role")).toBe("combobox");
  expect(add.classList.contains("add-paint")).toBe(true);
  f.notify.mockClear();
  await choose(f.host, "grouping-add", "Name");
  expect(f.source.value.groupBy).toBe("team,name");
  expect(f.notify).toHaveBeenCalledExactlyOnceWith(["team", "name"]);
  expect(f.host.querySelectorAll(part("grouping-panel"))).toHaveLength(1);
  node<HTMLButtonElement>(f.host, part("grouping-chip-remove")).click();
  await tick();
  expect(f.source.value.groupBy).toBe("name");
  expect(f.notify).toHaveBeenLastCalledWith(["name"]);
});
it("reorders through real drag payloads and sends exactly one notification after the successful write", async () => {
  const f = fixture(["team", "name"]);
  await tick();
  f.notify.mockClear();
  f.write.mockClear();
  const data = transfer();
  drag(node(f.host, part("grouping-chip-handle")), "dragstart", data);
  await tick();
  const zones = f.host.querySelectorAll<HTMLElement>(
    part("grouping-drop-zone")
  );
  const last = zones.item(zones.length - 1);
  drag(last, "dragenter", data);
  drag(last, "dragover", data);
  drag(last, "drop", data);
  await tick();
  expect(f.source.value.groupBy).toBe("name,team");
  expect(f.write).toHaveBeenCalledExactlyOnceWith("name,team");
  expect(f.notify).toHaveBeenCalledExactlyOnceWith(["name", "team"]);
  expect(f.host.querySelectorAll(part("grouping-remove-zone"))).toHaveLength(0);
});
it("obeys RTL keyboard direction and announces the core move", async () => {
  const f = fixture(["team", "name"], { dir: "rtl" });
  await tick();
  f.notify.mockClear();
  const handle = node<HTMLButtonElement>(f.host, part("grouping-chip-handle"));
  handle.focus();
  handle.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "ArrowLeft",
      bubbles: true,
      cancelable: true,
    })
  );
  await tick();
  expect(f.source.value.groupBy).toBe("name,team");
  expect(f.notify).toHaveBeenCalledExactlyOnceWith(["name", "team"]);
  expect(node(f.host, part("grouping-announcer")).textContent).toBeTruthy();
  expect(node(f.host, part("grouping-panel")).getAttribute("dir")).toBe("rtl");
});
it("preserves rejected source requests and repeats their notification once per attempt", async () => {
  const f = fixture([]);
  await tick();
  f.accept.value = false;
  f.notify.mockClear();
  f.write.mockClear();
  for (const count of [1, 2]) {
    await choose(f.host, "grouping-add", "Team");
    expect(f.write).toHaveBeenCalledTimes(count);
    expect(f.notify).toHaveBeenCalledTimes(count);
    expect(f.host.querySelectorAll(part("grouping-chip"))).toHaveLength(0);
    expect(f.source.value.groupBy).toBeUndefined();
  }
  expect(f.notify.mock.calls).toEqual([[["team"]], [["team"]]]);
  f.accept.value = true;
  await choose(f.host, "grouping-add", "Team");
  expect(f.source.value.groupBy).toBe("team");
});
it("edits aggregates through native selection and checkbox controls and restores defaults", async () => {
  const f = fixture();
  await tick();
  const operation = node<HTMLButtonElement>(
    f.host,
    part("grouping-aggregation-operation")
  );
  expect(operation.getAttribute("role")).toBe("combobox");
  operation.focus();
  key(operation, "ArrowDown");
  await tick();
  const option = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((value) => value.textContent?.trim() === "Average");
  if (!option) throw new Error("Missing Average aggregation");
  key(option, "Enter");
  await tick();
  expect(f.source.value.groupAggregateOverrides?.score).toBe("avg");
  node<HTMLButtonElement>(
    f.host,
    part("grouping-aggregations-restore")
  ).click();
  await tick();
  expect(f.source.value.groupAggregateOverrides?.score).toBeUndefined();
  const checkbox = node<HTMLButtonElement>(
    f.host,
    part("grouping-aggregation-option")
  );
  expect(checkbox.getAttribute("role")).toBe("checkbox");
  expect(checkbox.getAttribute("aria-checked")).toBe("true");
  checkbox.click();
  await tick();
  expect(checkbox.getAttribute("aria-checked")).toBe("false");
  expect(
    f.host.querySelector(part("grouping-aggregation-operation"))
  ).toBeNull();
  checkbox.click();
  await tick();
  expect(
    f.host.querySelector(part("grouping-aggregation-operation"))
  ).not.toBeNull();
});
it("uses the mobile chooser and retires open native popups and removed feature handlers", async () => {
  const f = fixture(["team"], { forceMobile: true });
  await tick();
  expect(node(f.host, part("grouping-panel")).hasAttribute("data-mobile")).toBe(
    true
  );
  expect(f.host.querySelector(part("grouping-drop-zone"))).toBeNull();
  const add = node<HTMLButtonElement>(f.host, part("grouping-add"));
  add.focus();
  key(add, "ArrowDown");
  await tick();
  expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  f.shown.value = false;
  await tick();
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  f.shown.value = true;
  await tick();
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  const remove = node<HTMLButtonElement>(f.host, part("grouping-chip-remove"));
  f.props.value = { ...f.props.value, features: [] };
  await tick();
  f.notify.mockClear();
  f.write.mockClear();
  remove.click();
  await tick();
  expect(f.notify).not.toHaveBeenCalled();
  expect(f.write).not.toHaveBeenCalled();
});

it("keeps aggregate rejections controlled and disables native controls without a source writer", async () => {
  const f = fixture();
  await tick();
  f.acceptAggregates.value = false;
  const checkbox = node<HTMLButtonElement>(
    f.host,
    part("grouping-aggregation-option")
  );
  checkbox.click();
  await tick();
  expect(f.writeAggregates).toHaveBeenCalledExactlyOnceWith({ score: "none" });
  expect(checkbox.getAttribute("aria-checked")).toBe("true");
  expect(f.source.value.groupAggregateOverrides?.score).toBeUndefined();
  f.writableAggregates.value = false;
  await tick();
  expect(
    node<HTMLButtonElement>(f.host, part("grouping-aggregation-operation"))
      .disabled
  ).toBe(true);
  expect(
    node<HTMLButtonElement>(f.host, part("grouping-aggregation-option"))
      .disabled
  ).toBe(true);
  f.writeAggregates.mockClear();
  node<HTMLButtonElement>(f.host, part("grouping-aggregation-remove")).click();
  await tick();
  expect(f.writeAggregates).not.toHaveBeenCalled();
  expect(
    f.host.querySelector(part("grouping-aggregation-operation"))
  ).not.toBeNull();
});
