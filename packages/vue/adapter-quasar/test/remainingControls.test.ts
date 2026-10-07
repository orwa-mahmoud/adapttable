import { mount } from "@vue/test-utils";
import {
  QBadge,
  QBtn,
  QCard,
  QCheckbox,
  QDialog,
  QInput,
  QItem,
  QMenu,
  QSelect,
  Quasar,
} from "quasar";
import { afterEach, expect, it, vi } from "vitest";
import { defineComponent, h, KeepAlive, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../src/cell-navigation";
import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import { groupingPanel } from "../src/grouping-panel";
import { rowReorder } from "../src/row-reorder";
import { sidePanel } from "../src/side-panel";

interface Row {
  id: string;
  name: string;
  team: string;
  amount: number;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", team: "Core", amount: 4 },
  { id: "b", name: "Bea", team: "Core", amount: 8 },
  { id: "c", name: "Cam", team: "Cloud", amount: 6 },
];
const columns = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team" },
  {
    key: "amount",
    header: "Amount",
    editable: true,
    editor: "number" as const,
    aggregatable: true,
  },
];
const base = {
  data: rows,
  columns,
  rowKey: (row: Row) => row.id,
  searchable: false,
  urlSync: false,
  forceMobile: false,
};
const native = { attachTo: document.body, global: { plugins: [Quasar] } };
const wrappers: ReturnType<typeof mount>[] = [];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 45));
  await nextTick();
};
function element<T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document.body
): T {
  const target = root.querySelector<T>(selector);
  if (!target) throw new Error(`Missing ${selector}`);
  return target;
}
async function key(
  target: HTMLElement,
  value: string,
  options: KeyboardEventInit = {}
) {
  const keyCode =
    (
      {
        Escape: 27,
        Enter: 13,
        " ": 32,
        ArrowDown: 40,
        ArrowUp: 38,
        ArrowRight: 39,
        ArrowLeft: 37,
      } as Record<string, number>
    )[value] ?? 0;
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      keyCode,
      bubbles: true,
      cancelable: true,
      ...options,
    })
  );
  await nextTick();
  (target.isConnected ? target : document.activeElement)?.dispatchEvent(
    new KeyboardEvent("keyup", {
      key: value,
      keyCode,
      bubbles: true,
      cancelable: true,
      ...options,
    })
  );
  await settle();
}
async function click(selector: string) {
  const target = element(selector);
  target.focus();
  target.click();
  await settle();
}
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  await settle();
});

it("uses QCheckbox and a binding-owned range, mirrors RTL navigation and requests fills without writing rows", async () => {
  const changed = vi.fn();
  const fill = vi.fn();
  const wrapper = mount(DataTable<Row>, {
    ...native,
    props: {
      ...base,
      dir: "rtl",
      onCellFill: fill,
      features: [
        cellNavigation({ onRangeChange: changed }),
        columnSelectionCheckbox(),
      ],
    },
  });
  wrappers.push(wrapper);
  await settle();
  expect(wrapper.findComponent(QCheckbox).exists()).toBe(true);
  changed.mockClear();
  const box = element('[aria-label="Select column: Name"]');
  box.click();
  await settle();
  expect(changed).toHaveBeenCalledOnce();
  expect(box.getAttribute("aria-checked")).toBe("true");
  box.click();
  await settle();
  expect(box.getAttribute("aria-checked")).toBe("false");
  const first = element('[data-grid-cell="0:0"]');
  first.focus();
  await key(first, "ArrowLeft");
  expect(document.activeElement).toBe(element('[data-grid-cell="0:1"]'));
  await key(element('[data-grid-cell="0:1"]'), "ArrowLeft");
  await key(element('[data-grid-cell="0:2"]'), "ArrowDown", { shiftKey: true });
  expect(wrapper.findComponent(QBadge).exists()).toBe(true);
  expect(element(part("fill-handle")).getAttribute("aria-hidden")).toBe("true");
  await key(element('[data-grid-cell="1:2"]'), "d", { ctrlKey: true });
  expect(fill).toHaveBeenCalledExactlyOnceWith([
    { row: rows[1], columnKey: "amount", value: "4" },
  ]);
  expect(rows[1]?.amount).toBe(8);
});

it("preserves disabled active commands, native input identity, rejected close and one command execution", async () => {
  const open = shallowRef(false);
  const accept = shallowRef(false);
  const run = vi.fn();
  const blocked = vi.fn();
  const changed = vi.fn((value: boolean) => {
    if (value || accept.value) open.value = value;
  });
  const feature = commandPalette({
    open,
    button: true,
    onOpenChange: changed,
    commands: [
      {
        key: "blocked",
        label: "Custom blocked",
        disabled: true,
        onSelect: blocked,
      },
      { key: "run", label: "Custom run", onSelect: run },
    ],
  });
  const wrapper = mount(DataTable<Row>, {
    ...native,
    props: {
      ...base,
      dir: "rtl",
      features: [feature],
      classNames: {
        commandInput: "host-input",
        commandPalette: "host-palette",
        commandItem: "host-item",
      },
    },
  });
  wrappers.push(wrapper);
  await settle();
  const trigger = element(part("command-palette-button"));
  await click(part("command-palette-button"));
  const input = element<HTMLInputElement>(part("command-input"));
  expect(wrapper.findComponent(QDialog).exists()).toBe(true);
  expect(wrapper.findComponent(QInput).exists()).toBe(true);
  expect(element(part("command-palette")).getAttribute("role")).toBe("dialog");
  expect(element(part("command-palette")).getAttribute("dir")).toBe("rtl");
  expect(input.classList.contains("host-input")).toBe(true);
  expect(document.activeElement).toBe(input);
  input.value = "Custom";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
  expect(element(part("command-input"))).toBe(input);
  const active = () =>
    document.getElementById(input.getAttribute("aria-activedescendant") ?? "");
  expect(active()?.textContent).toContain("Custom blocked");
  expect(active()?.getAttribute("aria-disabled")).toBe("true");
  await key(input, "Enter");
  expect(blocked).not.toHaveBeenCalled();
  expect(changed).toHaveBeenCalledTimes(1);
  await key(input, "Escape");
  expect(open.value).toBe(true);
  expect(document.activeElement).toBe(input);
  expect(changed).toHaveBeenCalledTimes(2);
  await key(input, "ArrowDown");
  expect(active()?.textContent).toContain("Custom run");
  accept.value = true;
  await key(input, "Enter");
  expect(run).toHaveBeenCalledOnce();
  expect(open.value).toBe(false);
  expect(document.activeElement).toBe(trigger);
  await click(part("command-palette-button"));
  const reopened = element<HTMLInputElement>(part("command-input"));
  expect(reopened.value).toBe("");
  reopened.value = "no-such-command";
  reopened.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
  expect(element(part("command-empty")).textContent).toContain(
    "No matching command"
  );
  await key(reopened, "Escape");
  expect(document.querySelector(part("command-palette"))).toBeNull();
});

it("retires native command dialogs during KeepAlive and resumes the same controlled owner", async () => {
  const visible = shallowRef(true);
  const open = shallowRef(false);
  const feature = commandPalette({
    open,
    button: true,
    onOpenChange: (value) => {
      open.value = value;
    },
  });
  const Table = defineComponent(
    () => () => h(DataTable<Row>, { ...base, features: [feature] })
  );
  const Other = defineComponent(() => () => h("p", "Paused"));
  const wrapper = mount(
    defineComponent(
      () => () =>
        h("div", [
          h("input", { id: "outside-focus" }),
          h(
            KeepAlive,
            {},
            { default: () => (visible.value ? h(Table) : h(Other)) }
          ),
        ])
    ),
    native
  );
  wrappers.push(wrapper);
  await settle();
  await click(part("command-palette-button"));
  visible.value = false;
  await nextTick();
  element("#outside-focus").focus();
  await settle();
  expect(document.querySelector(part("command-palette"))).toBeNull();
  expect(document.activeElement).toBe(element("#outside-focus"));
  visible.value = true;
  await settle();
  expect(document.querySelectorAll(part("command-palette"))).toHaveLength(1);
  await key(element(part("command-input")), "Escape");
  expect(open.value).toBe(false);
});

it("opens a genuine cell context menu, skips disabled items and restores the canonical opener", async () => {
  const run = vi.fn();
  const blocked = vi.fn();
  const wrapper = mount(DataTable<Row>, {
    ...native,
    props: {
      ...base,
      dir: "rtl",
      features: [
        cellNavigation(),
        contextMenu<Row>({
          items: () => [
            {
              key: "blocked",
              label: "Blocked custom",
              disabled: true,
              onSelect: blocked,
            },
            {
              key: "run",
              label: "Run custom",
              separatorBefore: true,
              danger: true,
              onSelect: run,
            },
          ],
        }),
      ],
    },
  });
  wrappers.push(wrapper);
  await settle();
  const cell = element('[data-row-id="a"] [data-column-key="name"]');
  cell.focus();
  await key(cell, "F10", { shiftKey: true });
  expect(wrapper.findComponent(QMenu).exists()).toBe(true);
  expect(wrapper.findComponent(QItem).exists()).toBe(true);
  const menu = element(part("context-menu"));
  expect(menu.getAttribute("dir")).toBe("rtl");
  await key(element('[role="menuitem"]', menu), "End");
  expect(document.activeElement?.textContent).toContain("Run custom");
  const disabled = [
    ...menu.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ].find((item) => item.textContent?.includes("Blocked custom"));
  disabled?.click();
  await settle();
  expect(blocked).not.toHaveBeenCalled();
  await key(document.activeElement as HTMLElement, "Enter");
  expect(run).toHaveBeenCalledOnce();
  expect(document.querySelector(part("context-menu"))).toBeNull();
  expect(document.activeElement).toBe(cell);
});

it.each([false, true])(
  "preserves controlled side-panel tabs, RTL keys and nested native select Escape, mobile=%s",
  async (mobile) => {
    const open = shallowRef<string | null>("a");
    const accept = shallowRef(false);
    const changed = vi.fn((value: string | null) => {
      if (accept.value) open.value = value;
    });
    const feature = sidePanel({
      open,
      onOpenChange: changed,
      side: "start",
      panels: [
        {
          key: "a",
          label: "Alpha",
          content: () =>
            h(QSelect, {
              modelValue: "one",
              options: ["one", "two"],
              "aria-label": "Panel choice",
            }),
        },
        { key: "b", label: "Beta", content: "Beta body" },
      ],
    });
    const wrapper = mount(DataTable<Row>, {
      ...native,
      props: {
        ...base,
        forceMobile: mobile,
        dir: "rtl",
        features: [feature],
        classNames: { sidePanelTab: "host-tab", sidePanelBody: "host-body" },
      },
    });
    wrappers.push(wrapper);
    await settle();
    expect(wrapper.findComponent(QCard).exists()).toBe(true);
    const tabs = wrapper.findAll(part("side-panel-tab"));
    expect(tabs[0]?.classes()).toContain("host-tab");
    await key(tabs[0]!.element as HTMLElement, "ArrowLeft");
    expect(changed).toHaveBeenLastCalledWith("b");
    expect(open.value).toBe("a");
    accept.value = true;
    await key(tabs[0]!.element as HTMLElement, "ArrowLeft");
    expect(open.value).toBe("b");
    expect(wrapper.get(part("side-panel-body")).text()).toBe("Beta body");
    await key(
      element(part("side-panel-tab") + '[aria-selected="true"]'),
      "ArrowRight"
    );
    expect(open.value).toBe("a");
    const input = element<HTMLInputElement>('input[aria-label="Panel choice"]');
    await key(input, "ArrowDown");
    await key(input, "Escape");
    expect(open.value).toBe("a");
    await key(element(part("side-panel-body")), "Escape");
    expect(open.value).toBeNull();
    expect(wrapper.find(part("side-panel")).exists()).toBe(false);
  }
);

it("groups with native Quasar fields, announces one accepted change and adds/removes aggregates", async () => {
  const changed = vi.fn();
  const wrapper = mount(DataTable<Row>, {
    ...native,
    props: {
      ...base,
      features: [groupingPanel<Row>(undefined, { onGroupByChange: changed })],
      classNames: {
        groupingChipHandle: "host-grip",
        groupingAggregationAdd: "host-aggregates",
      },
    },
  });
  wrappers.push(wrapper);
  await settle();
  const select = element(part("grouping-add"));
  await key(select, "ArrowDown");
  const team = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((option) => option.textContent?.trim() === "Team");
  expect(team).toBeDefined();
  team!.click();
  await settle();
  expect(changed).toHaveBeenCalledExactlyOnceWith(["team"]);
  expect(wrapper.findAll(part("group-row"))).toHaveLength(2);
  expect(wrapper.get(part("grouping-chip-handle")).classes()).toContain(
    "host-grip"
  );
  const checkbox = element(
    `${part("grouping-aggregation-add")} [role="checkbox"]`
  );
  checkbox.click();
  await settle();
  expect(wrapper.find(part("grouping-aggregation-operation")).exists()).toBe(
    true
  );
  await click(part("grouping-aggregation-remove"));
  expect(wrapper.find(part("grouping-aggregation-operation")).exists()).toBe(
    false
  );
  await click(part("grouping-chip-remove"));
  expect(wrapper.find(part("grouping-chip")).exists()).toBe(false);
  expect(rows.map((row) => row.amount)).toEqual([4, 8, 6]);
});

it("keeps RTL grouping order in the canonical keyboard model", async () => {
  const changed = vi.fn();
  const wrapper = mount(DataTable<Row>, {
    ...native,
    props: {
      ...base,
      dir: "rtl",
      features: [
        groupingPanel<Row>(["team", "amount"], { onGroupByChange: changed }),
      ],
    },
  });
  wrappers.push(wrapper);
  await settle();
  changed.mockClear();
  await key(element(part("grouping-chip-handle")), "ArrowLeft");
  expect(changed).toHaveBeenCalledExactlyOnceWith(["amount", "team"]);
  expect(wrapper.get(part("grouping-chip")).text()).toContain("Amount");
});

it.each([false, true])(
  "requests host-owned row reorder through native controls, mobile=%s",
  async (mobile) => {
    const moved = vi.fn();
    const wrapper = mount(DataTable<Row>, {
      ...native,
      props: {
        ...base,
        forceMobile: mobile,
        features: [rowReorder<Row>(moved)],
      },
    });
    wrappers.push(wrapper);
    await settle();
    expect(wrapper.findComponent(QBtn).exists()).toBe(true);
    if (mobile) {
      expect(element<HTMLButtonElement>(part("row-reorder-up")).disabled).toBe(
        true
      );
      await click(part("row-reorder-down"));
    } else {
      const grip = element(part("row-reorder-handle"));
      grip.focus();
      await key(grip, " ");
      expect(grip.getAttribute("aria-pressed")).toBe("true");
      await key(grip, "ArrowDown");
      await key(grip, " ");
    }
    expect(moved).toHaveBeenCalledExactlyOnceWith(0, 1, rows[0]);
    expect(rows[0]?.id).toBe("a");
  }
);

it("uses a native destination menu and confirmation dialog with cancel and host-only confirmation", async () => {
  const moved = vi.fn();
  const wrapper = mount(DataTable<Row>, {
    ...native,
    props: {
      ...base,
      dir: "rtl",
      features: [
        groupingPanel<Row>("team"),
        rowReorder<Row>(() => undefined, {
          movePolicy: "confirm",
          onGroupMove: moved,
        }),
      ],
    },
  });
  wrappers.push(wrapper);
  await settle();
  const trigger = element(`[data-row-id="a"] ${part("row-move-menu-trigger")}`);
  const request = async () => {
    trigger.focus();
    trigger.click();
    await settle();
    const item = element(
      `${part("row-move-menu-item")}:not([aria-disabled="true"])`
    );
    item.focus();
    await key(item, "Enter");
  };
  await request();
  expect(element(part("row-move-confirmation")).getAttribute("role")).toBe(
    "alertdialog"
  );
  expect(element(part("row-move-confirmation")).getAttribute("dir")).toBe(
    "rtl"
  );
  expect(document.activeElement).toBe(element(part("row-move-cancel")));
  await click(part("row-move-cancel"));
  expect(moved).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(trigger);
  await request();
  await click(part("row-move-confirm"));
  expect(moved).toHaveBeenCalledOnce();
  expect(document.querySelector(part("row-move-confirmation"))).toBeNull();
  expect(rows[0]?.team).toBe("Core");
  expect(document.activeElement).toBe(trigger);
});
