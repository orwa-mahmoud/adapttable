import { type ColumnDef, useColumnLayout } from "@adapttable/vue";
import {
  ColumnMenuChrome,
  type ColumnMenuSlotProps,
  managedOverlayPanel,
  resolveLabels,
  useColumnMenu,
} from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { elementColumnMenuSlots } from "../src/columns/elementColumnMenuControls";
import { ElementColumnMenuPanel } from "../src/columns/ElementColumnMenuPanel";
import { mount, node } from "./mount";
interface Row {
  name: string;
}
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", renameable: true },
];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
async function escape(target: HTMLElement) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  await tick();
}
function fixture() {
  const chosen = ref("sum");
  const acceptValue = ref(false);
  const acceptClose = ref(false);
  const changed = vi.fn((value: string) => {
    if (acceptValue.value) chosen.value = value;
  });
  const closed = vi.fn();
  const featureHost: NonNullable<ColumnMenuSlotProps<Row>["featureHost"]> = {
    filterTypes: [],
    filterExtends: [],
    editors: new Map(),
    aggregators: new Map(),
    writers: [],
    panels: [],
    commands: [],
    contextMenuItems: [],
    columnMenuActions: [
      () => ({
        kind: "choice",
        id: "aggregate",
        label: "Aggregate",
        value: chosen.value,
        disabled: false,
        options: [
          { value: "sum", label: "Sum" },
          { value: "avg", label: "Average" },
        ],
        onChange: changed,
      }),
    ],
  };
  const controls = {
    ...elementColumnMenuSlots,
    Panel: managedOverlayPanel((control) =>
      h(ElementColumnMenuPanel, {
        control: {
          ...control,
          onClose: (reason) => {
            closed(reason);
            if (acceptClose.value) control.onClose(reason);
          },
        },
      })
    ),
  };
  const App = defineComponent({
    setup() {
      const layout = useColumnLayout(columns, () => ({}));
      const model = useColumnMenu(() => ({
        allColumns: columns,
        layout: layout.value,
        labels: resolveLabels(undefined),
        onAutoSize: () => undefined,
        featureHost,
      }));
      return () => h(ColumnMenuChrome, { model, slots: controls });
    },
  });
  return {
    ...mount(() => h(App)),
    chosen,
    acceptValue,
    acceptClose,
    changed,
    closed,
  };
}
describe("Element Plus three-layer Columns Escape", () => {
  it("closes the open Select, then the row submenu, then requests only the outer close", async () => {
    const view = fixture();
    await tick();
    const trigger = node<HTMLButtonElement>(
      view.root,
      part("column-menu-button")
    );
    trigger.focus();
    trigger.click();
    await tick();
    const panel = node<HTMLElement>(document, part("column-menu-panel"));
    const more = node<HTMLButtonElement>(panel, part("column-menu-more"));
    more.click();
    await tick();
    const input = node<HTMLInputElement>(panel, 'input[role="combobox"]');
    input.focus();
    input.click();
    await tick();
    expect(input.getAttribute("aria-expanded")).toBe("true");
    const list = node<HTMLElement>(
      document,
      `#${input.getAttribute("aria-controls")}`
    );
    expect(panel.contains(list)).toBe(true);
    expect(node(panel, ".el-card__body").contains(list)).toBe(false);
    await escape(input);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(panel.querySelector(part("column-menu-submenu"))).not.toBeNull();
    expect(view.closed).not.toHaveBeenCalled();
    await escape(input);
    expect(panel.querySelector(part("column-menu-submenu"))).toBeNull();
    expect(document.activeElement).toBe(more);
    expect(view.closed).not.toHaveBeenCalled();
    await escape(more);
    expect(view.closed).toHaveBeenCalledExactlyOnceWith("escape");
    expect(document.querySelector(part("column-menu-panel"))).toBe(panel);
    expect(document.activeElement).toBe(more);
    view.acceptClose.value = true;
    await escape(more);
    expect(view.closed).toHaveBeenCalledTimes(2);
    expect(document.querySelector(part("column-menu-panel"))).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(view.changed).not.toHaveBeenCalled();
  });
  it("keeps the real plugin choice controlled through rejection and accepted updates", async () => {
    const view = fixture();
    await tick();
    node<HTMLButtonElement>(view.root, part("column-menu-button")).click();
    await tick();
    const panel = node<HTMLElement>(document, part("column-menu-panel"));
    node<HTMLButtonElement>(panel, part("column-menu-more")).click();
    await tick();
    const input = node<HTMLInputElement>(panel, 'input[role="combobox"]');
    input.click();
    await tick();
    function choice(label: string) {
      const target = [
        ...panel.querySelectorAll<HTMLElement>('[role="option"]'),
      ].find((item) => item.textContent?.trim() === label);
      if (!target) throw new Error(`Missing option ${label}`);
      return target;
    }
    choice("Average").click();
    await tick();
    expect(view.changed).toHaveBeenCalledExactlyOnceWith("avg");
    expect(view.chosen.value).toBe("sum");
    input.click();
    await tick();
    expect(choice("Sum").getAttribute("aria-selected")).toBe("true");
    expect(choice("Average").getAttribute("aria-selected")).toBe("false");
    view.acceptValue.value = true;
    choice("Average").click();
    await tick();
    expect(view.changed).toHaveBeenCalledTimes(2);
    expect(view.chosen.value).toBe("avg");
    input.click();
    await tick();
    expect(choice("Average").getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector(part("column-menu-panel"))).toBe(panel);
    expect(view.closed).not.toHaveBeenCalled();
  });
  it("reads standalone inherited direction on each open without discarding its query", async () => {
    const view = fixture();
    view.acceptClose.value = true;
    await tick();
    const trigger = node<HTMLButtonElement>(
      view.root,
      part("column-menu-button")
    );
    trigger.style.direction = "rtl";
    trigger.click();
    await tick();
    const panel = node<HTMLElement>(document, part("column-menu-panel"));
    await vi.waitFor(() => expect(panel.getAttribute("dir")).toBe("rtl"));
    const search = node<HTMLInputElement>(panel, part("column-menu-search"));
    search.value = "Name";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    await escape(search);
    trigger.style.direction = "ltr";
    trigger.click();
    await tick();
    const reopened = node<HTMLElement>(document, part("column-menu-panel"));
    await vi.waitFor(() => expect(reopened.getAttribute("dir")).toBe("ltr"));
    expect(
      node<HTMLInputElement>(reopened, part("column-menu-search")).value
    ).toBe("Name");
    expect(view.changed).not.toHaveBeenCalled();
  });
});
