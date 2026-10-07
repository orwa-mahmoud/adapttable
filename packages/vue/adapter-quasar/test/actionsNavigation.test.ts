import type { ConfirmRequest } from "@adapttable/vue";
import {
  type DataTableProps,
  provideDataTableClassNames,
} from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import { QBadge, QBar, QBtn, QInput, Quasar } from "quasar";
import { afterEach, expect, it, vi } from "vitest";
import { defineComponent, h, KeepAlive, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { bulkActions } from "../src/bulk-actions";
import { findInTable } from "../src/find-in-table";
import { QuasarStatusBar } from "../src/navigation/QuasarStatusBar";
import { print } from "../src/print";
import { selectionStats } from "../src/selection-stats";
import { statusBar } from "../src/status-bar";

interface Row {
  id: string;
  name: string;
  amount: number;
}
const rows: Row[] = [
  { id: "a", name: "Ada", amount: 20 },
  { id: "b", name: "Bea", amount: 40 },
];
const wrappers: ReturnType<typeof mount>[] = [];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 35));
  await nextTick();
};
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  await settle();
});
function fixture(options: () => Partial<DataTableProps<Row>>) {
  const live = shallowRef(true);
  const Owner = defineComponent(
    () => () =>
      h(DataTable<Row>, {
        data: rows,
        columns: [{ key: "name" }, { key: "amount" }],
        rowKey: (row) => row.id,
        forceMobile: false,
        urlSync: false,
        searchDebounceMs: 0,
        ...options(),
      })
  );
  const wrapper = mount(
    defineComponent(
      () => () => h(KeepAlive, {}, () => (live.value ? h(Owner) : null))
    ),
    { attachTo: document.body, global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  return { wrapper, live };
}

it("prints through an actual QBtn only while its owner is active", async () => {
  const callback = vi.fn();
  const features = [print(callback, true)];
  const f = fixture(() => ({ features }));
  await settle();
  const button = f.wrapper.get(part("print-button"));
  expect(button.element.tagName).toBe("BUTTON");
  expect(
    f.wrapper
      .findAllComponents(QBtn)
      .some((item) => item.element === button.element)
  ).toBe(true);
  await button.trigger("click");
  expect(callback).toHaveBeenCalledTimes(1);
  f.live.value = false;
  await settle();
  (button.element as HTMLButtonElement).click();
  expect(callback).toHaveBeenCalledTimes(1);
  f.live.value = true;
  await settle();
  await f.wrapper.get(part("print-button")).trigger("click");
  expect(callback).toHaveBeenCalledTimes(2);
});

it("runs confirmed bulk work once, disables pending native buttons, and clears selection only after completion", async () => {
  let confirmation: ConfirmRequest | undefined;
  let finish: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const run = vi.fn(() => promise);
  const features = [
    bulkActions([
      {
        key: "archive",
        label: "Archive",
        onClick: run,
        confirm: {
          title: "Archive rows",
          message: () => "Archive the selection?",
          confirmLabel: "Archive",
        },
      },
    ]),
  ];
  const f = fixture(() => ({
    features,
    selectable: true,
    defaultSelectedIds: ["a"],
    confirm: (request) => {
      confirmation = request;
    },
  }));
  await settle();
  const button = f.wrapper.get<HTMLButtonElement>(part("bulk-button"));
  await button.trigger("click");
  expect(run).not.toHaveBeenCalled();
  expect(confirmation?.title).toBe("Archive rows");
  confirmation?.onConfirm();
  await settle();
  expect(run).toHaveBeenCalledExactlyOnceWith(
    ["a"],
    expect.objectContaining({ allMatching: false })
  );
  expect(button.element.disabled).toBe(true);
  button.element.click();
  expect(run).toHaveBeenCalledTimes(1);
  expect(f.wrapper.find(part("bulk-bar")).exists()).toBe(true);
  finish?.();
  await settle();
  expect(f.wrapper.find(part("bulk-bar")).exists()).toBe(false);
  expect(rows.map((row) => row.id)).toEqual(["a", "b"]);
});

it("shows a bulk failure, allows a deliberate retry, and never invokes a disabled action", async () => {
  const disabled = vi.fn();
  const run = vi
    .fn()
    .mockRejectedValueOnce(new Error("Server unavailable"))
    .mockResolvedValueOnce(undefined);
  const features = [
    bulkActions([
      { key: "retry", label: "Retry action", onClick: run },
      {
        key: "disabled",
        label: "Disabled",
        onClick: disabled,
        disabledReason: () => "Select an eligible row",
      },
    ]),
  ];
  const f = fixture(() => ({
    features,
    selectable: true,
    defaultSelectedIds: ["a"],
  }));
  await settle();
  const buttons = f.wrapper.findAll<HTMLButtonElement>(part("bulk-button"));
  const retry = buttons[0];
  const blocked = buttons[1];
  if (!retry || !blocked) throw new Error("Missing native bulk controls");
  expect(blocked.element.disabled).toBe(true);
  expect(blocked.attributes("title")).toBe("Select an eligible row");
  blocked.element.click();
  expect(disabled).not.toHaveBeenCalled();
  await retry.trigger("click");
  await settle();
  expect(f.wrapper.get(part("bulk-error")).text()).toBe("Server unavailable");
  expect(retry.element.disabled).toBe(false);
  await retry.trigger("click");
  await settle();
  expect(run).toHaveBeenCalledTimes(2);
  expect(f.wrapper.find(part("bulk-bar")).exists()).toBe(false);
});

it("does not execute a confirmation callback while the table is suspended", async () => {
  let confirmation: ConfirmRequest | undefined;
  const run = vi.fn();
  const features = [
    bulkActions([
      {
        key: "run",
        label: "Run",
        onClick: run,
        confirm: {
          title: "Run",
          message: () => "Continue?",
          confirmLabel: "Run",
        },
      },
    ]),
  ];
  const f = fixture(() => ({
    features,
    selectable: true,
    defaultSelectedIds: ["a"],
    confirm: (request) => {
      confirmation = request;
    },
  }));
  await settle();
  await f.wrapper.get(part("bulk-button")).trigger("click");
  f.live.value = false;
  await settle();
  confirmation?.onConfirm();
  expect(run).not.toHaveBeenCalled();
  f.live.value = true;
  await settle();
  expect(f.wrapper.find(part("bulk-bar")).exists()).toBe(true);
});

it("finds rows through the same native search target and returns focus after Escape", async () => {
  const f = fixture(() => ({
    features: [findInTable({ button: true }), statusBar(), selectionStats()],
    classNames: { findInput: "custom-find", statusBar: "custom-status" },
  }));
  await settle();
  const trigger = f.wrapper.get<HTMLButtonElement>(part("find-button"));
  trigger.element.focus();
  await trigger.trigger("click");
  await settle();
  const input = f.wrapper.get<HTMLInputElement>(part("find-input"));
  expect(f.wrapper.findComponent(QInput).exists()).toBe(true);
  expect(input.element.tagName).toBe("INPUT");
  expect(document.activeElement).toBe(input.element);
  expect(input.classes()).toContain("custom-find");
  await input.setValue("Ada");
  await settle();
  expect(f.wrapper.get(part("find-count")).text()).toContain("1");
  expect(f.wrapper.get(part("find-input")).element).toBe(input.element);
  expect(f.wrapper.findComponent(QBar).exists()).toBe(true);
  expect(f.wrapper.get(part("status-bar")).attributes("role")).toBe("status");
  await input.trigger("keydown", { key: "Enter" });
  await input.trigger("keydown", { key: "Escape" });
  await settle();
  expect(f.wrapper.find(part("find-bar")).exists()).toBe(false);
  expect(document.activeElement).toBe(trigger.element);
});

it("keeps optional print and find toolbar controls absent until requested", async () => {
  const f = fixture(() => ({
    features: [print(() => undefined), findInTable()],
  }));
  await settle();
  expect(f.wrapper.find(part("print-button")).exists()).toBe(false);
  expect(f.wrapper.find(part("find-button")).exists()).toBe(false);
});

it("installs the status bar independently of selection statistics", async () => {
  const f = fixture(() => ({ features: [statusBar()] }));
  await settle();
  expect(f.wrapper.get(part("status-bar")).attributes("role")).toBe("status");
  expect(f.wrapper.get(part("status-bar")).text()).toContain("2");
  expect(f.wrapper.find(part("selection-stats")).exists()).toBe(false);
});

it("renders binding-computed selection statistics in native badges without duplicating them", () => {
  const wrapper = mount(
    defineComponent({
      setup() {
        provideDataTableClassNames(() => ({
          selectionStats: "stats",
          statusItem: "status-item",
        }));
        return () =>
          h(QuasarStatusBar, {
            enabled: true,
            shown: 2,
            total: 2,
            selected: 1,
            stats: {
              cells: 2,
              numeric: 2,
              sum: 60,
              average: 30,
              min: 20,
              max: 40,
            },
            locale: "en",
          });
      },
    }),
    { global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  expect(wrapper.findAll(part("selection-stats"))).toHaveLength(1);
  expect(wrapper.get('[data-stat="sum"]').text()).toContain("60");
  expect(wrapper.findAllComponents(QBadge).length).toBeGreaterThan(3);
  expect(wrapper.get(part("status-bar")).text()).toContain("2");
});
