import type { FilterDef, FilterOption, TableSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { h, shallowRef } from "vue";

import { DataTable } from "../src";
import { naiveButton } from "../src/controls/button";
import { naiveSelect } from "../src/controls/select";
import { filters } from "../src/filters";
import NaiveFilterField from "../src/filters/NaiveFilterField.vue";
import { NaiveFilterSurface } from "../src/filters/NaiveFilterSurface";
import NaiveFilterTree from "../src/filters/NaiveFilterTree.vue";
import { headerFilters } from "../src/header-filters";
import {
  choose,
  escape,
  find,
  mount,
  part,
  type Row,
  rows,
  settle,
  source,
  tick,
  write,
} from "./filter-helpers";

const labels = resolveLabels(undefined);
function field(def: FilterDef<Row>, accept = true) {
  const state = source(accept);
  const view = mount(
    () => h(NaiveFilterField<Row>, { def, source: state.value.value, labels }),
    {
      filterInput: "field-input",
      filterSelect: "field-select",
      filterCheckbox: "field-checkbox",
    }
  );
  return { ...state, ...view };
}

describe("Naive filter contributions", () => {
  it("keeps rejected text, select and checkbox writes controlled and forwards them once", async () => {
    const text = field({ key: "name", type: "text" }, false);
    const input = find<HTMLInputElement>(
      text.host,
      `input${part("filter-input")}`
    );
    await write(input, "Rejected");
    expect(input.value).toBe("");
    expect(text.setExtras).toHaveBeenCalledOnce();
    expect(input.classList.contains("field-input")).toBe(true);
    expect(input.getAttribute("aria-label")).toBe("Name");

    const select = field(
      {
        key: "name",
        type: "select",
        options: [{ value: "Ada", label: "Ada" }],
      },
      false
    );
    await choose(select.host, "Ada");
    expect(select.setExtra).toHaveBeenCalledExactlyOnceWith("name", "Ada");
    expect(select.extra.value.name).toBeUndefined();
    expect(
      find(select.host, part("filter-select")).classList.contains("n-select")
    ).toBe(true);

    const multi = field(
      {
        key: "name",
        type: "multiSelect",
        options: [{ value: "Ada", label: "Ada" }],
      },
      false
    );
    const checkbox = find(multi.host, '[role="checkbox"]');
    checkbox.click();
    await tick();
    expect(multi.setExtra).toHaveBeenCalledExactlyOnceWith("name", ["Ada"]);
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    expect(checkbox.classList.contains("n-checkbox")).toBe(true);
    expect(checkbox.classList.contains("field-checkbox")).toBe(true);
  });

  it("uses binding range, boolean and checklist models with native kit controls", async () => {
    const boolean = field({ key: "active", type: "boolean" });
    await choose(boolean.host, labels.boolTrue);
    expect(boolean.extra.value.active).toBe("true");
    const range = field({ key: "amount", type: "numberRange" });
    await choose(range.host, labels.opEqual);
    await write(find(range.host, 'input[type="number"]'), "2");
    expect(JSON.stringify(range.extra.value)).toContain("2");
    const checklist = field({ key: "name", type: "checklist" });
    await write(find(checklist.host, 'input[type="search"]'), "Ada");
    expect(checklist.host.querySelectorAll('[role="checkbox"]')).toHaveLength(
      1
    );
    find(checklist.host, '[role="checkbox"]').click();
    await tick();
    expect(checklist.extra.value.name).toEqual(["Ada"]);
    expect(
      find(checklist.host, part("filter-checklist-count")).textContent
    ).toBe("1");
  });

  it("loads options once and ignores an obsolete definition's late response", async () => {
    let firstResolve!: (options: readonly FilterOption[]) => void;
    let secondResolve!: (options: readonly FilterOption[]) => void;
    const first = vi.fn(
      () =>
        new Promise<readonly FilterOption[]>((resolve) => {
          firstResolve = resolve;
        })
    );
    const second = vi.fn(
      () =>
        new Promise<readonly FilterOption[]>((resolve) => {
          secondResolve = resolve;
        })
    );
    const state = source();
    const def = shallowRef<FilterDef<Row>>({
      key: "name",
      type: "select",
      options: first,
    });
    const view = mount(() =>
      h(NaiveFilterField<Row>, {
        def: def.value,
        source: state.value.value,
        labels,
      })
    );
    await tick();
    expect(first).toHaveBeenCalledOnce();
    expect(
      find(view.host, part("filter-field")).getAttribute("aria-busy")
    ).toBe("true");
    def.value = { key: "name", type: "select", options: second };
    await tick();
    secondResolve([{ value: "new", label: "New" }]);
    firstResolve([{ value: "old", label: "Old" }]);
    await tick();
    expect(second).toHaveBeenCalledOnce();
    expect(
      find(view.host, part("filter-field")).hasAttribute("aria-busy")
    ).toBe(false);
    await choose(view.host, "New");
    expect(state.extra.value.name).toBe("new");
  });

  it("uses a keyboard-accessible Naive disclosure and host-owned recursive tree writes", async () => {
    const tree =
      shallowRef<
        Parameters<NonNullable<TableSource<Row>["setFilterTree"]>>[0]
      >();
    const setFilterTree = vi.fn((value: typeof tree.value) => {
      tree.value = value;
    });
    const view = mount(() =>
      h(NaiveFilterTree<Row>, {
        defs: [{ key: "name", type: "text" }],
        source: { filterTree: tree.value, setFilterTree },
        defaultExpanded: false,
      })
    );
    const disclosure = find<HTMLButtonElement>(
      view.host,
      part("filter-tree-summary")
    );
    expect(disclosure.tagName).toBe("BUTTON");
    expect(disclosure.classList.contains("n-button")).toBe(true);
    disclosure.focus();
    expect(document.activeElement).toBe(disclosure);
    disclosure.click();
    await tick();
    expect(disclosure.getAttribute("aria-expanded")).toBe("true");
    find(
      view.host,
      `${part("filter-tree-actions")} button:nth-child(2)`
    ).click();
    await tick();
    expect(setFilterTree).toHaveBeenCalledOnce();
    const groups = view.host.querySelectorAll(part("filter-tree-group"));
    expect(groups, JSON.stringify(tree.value)).toHaveLength(2);
    find(groups[1]!, `${part("filter-tree-actions")} button`).click();
    await tick();
    await write(find(view.host, `input${part("filter-input")}`), "Ada");
    expect(JSON.stringify(tree.value)).toContain("Ada");
    find(view.host, part("filter-tree-remove")).click();
    await tick();
    expect(
      view.host.querySelectorAll(part("filter-tree-condition"))
    ).toHaveLength(0);
  });

  it.each(["popover", "drawer"] as const)(
    "filters a real RTL table through %s and updates its controlled controls",
    async (mode) => {
      const modal = mode === "drawer";
      const surfacePart = modal ? "filters-panel" : "filters-popover";
      const features = [
        filters<Row>([{ key: "name", type: "text" }], { tree: true, mode }),
        headerFilters(),
      ];
      const view = mount(() =>
        h(DataTable<Row>, {
          data: rows,
          columns: [{ key: "name" }],
          rowKey: (row: Row) => row.id,
          urlSync: false,
          dir: "rtl",
          features,
        })
      );
      const trigger = find(view.host, part("filters-button"));
      trigger.focus();
      trigger.click();
      await tick();
      const dialog = find(document.body, part(surfacePart));
      expect(dialog.classList.contains(`n-${mode}`)).toBe(true);
      expect(dialog.getAttribute("role")).toBe("dialog");
      expect(dialog.getAttribute("dir")).toBe("rtl");
      if (modal)
        expect(document.body.querySelector(".n-drawer-mask")).not.toBeNull();
      else expect(document.body.querySelector(".n-drawer-mask")).toBeNull();
      await write(find(dialog, `input${part("filter-input")}`), "Ada");
      expect(find(view.host, "tbody").textContent).toContain("Ada");
      expect(find(view.host, "tbody").textContent).not.toContain("Grace");
      const input = find<HTMLInputElement>(
        dialog,
        `input${part("filter-input")}`
      );
      expect(input.value).toBe("Ada");
      find<HTMLButtonElement>(dialog, part("filters-clear")).click();
      await tick();
      expect(input.value).toBe("");
      expect(find(view.host, "tbody").textContent).toContain("Grace");
      await write(input, "Ada");
      expect(input.value).toBe("Ada");
      input.focus();
      await escape(input);
      await settle();
      expect(document.body.querySelector(part(surfacePart))).toBeNull();
      expect(document.activeElement).toBe(trigger);
      find(view.host, part("chip-remove")).click();
      await tick();
      expect(find(view.host, "tbody").textContent).toContain("Grace");
      find(view.host, part("filter-header-trigger")).click();
      await tick();
      expect(
        find(document.body, part("filter-header-popover")).classList.contains(
          "n-popover"
        )
      ).toBe(true);
    }
  );

  it.each([false, true])(
    "dismisses a nested select before its %s modal filter surface",
    async (modal) => {
      const anchor = shallowRef<HTMLElement | null>(null);
      const open = shallowRef(false);
      const setAnchor = (value: HTMLElement | null) => {
        anchor.value = value;
      };
      const close = vi.fn(() => {
        open.value = false;
      });
      const view = mount(() =>
        h("div", [
          naiveButton(
            {
              ref: setAnchor,
              onClick: () => {
                open.value = true;
              },
            },
            "Filters"
          ),
          h(NaiveFilterSurface, {
            open: open.value,
            modal,
            label: "Filters",
            dir: "ltr",
            anchor: anchor.value,
            onClose: close,
            children: naiveSelect({
              attrs: { "aria-label": "Status" },
              value: "a",
              options: [
                { value: "a", label: "Active" },
                { value: "b", label: "Blocked" },
              ],
              onChange: vi.fn(),
            }),
          }),
        ])
      );
      const trigger = find<HTMLButtonElement>(view.host, "button");
      trigger.focus();
      trigger.click();
      await tick();
      const dialog = find(
        document.body,
        modal ? part("filters-panel") : part("filters-popover")
      );
      const select = find<HTMLInputElement>(dialog, 'input[role="combobox"]');
      select.click();
      await tick();
      expect(select.getAttribute("aria-expanded")).toBe("true");
      await escape(select);
      expect(select.getAttribute("aria-expanded")).toBe("false");
      expect(open.value).toBe(true);
      expect(close).not.toHaveBeenCalled();
      await escape(select);
      await settle();
      expect(close).toHaveBeenCalledExactlyOnceWith("escape");
      expect(open.value).toBe(false);
      expect(document.activeElement).toBe(trigger);
    }
  );

  it("retains the vendor drawer mask, trap and scroll lock across rejected dismissal", async () => {
    const open = shallowRef(true);
    const close = vi.fn();
    const beforeOverflow = document.documentElement.style.overflow;
    const view = mount(() =>
      h(NaiveFilterSurface, {
        open: open.value,
        modal: true,
        label: "Filters",
        dir: "rtl",
        anchor: null,
        children: naiveButton({}, "Inside"),
        onClose: close,
      })
    );
    await tick();
    const dialog = find(document.body, part("filters-panel"));
    expect(dialog.classList.contains("n-drawer--left-placement")).toBe(true);
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.documentElement.style.overflow).toBe("hidden");
    const mask = find(document.body, ".n-drawer-mask");
    expect(mask.hasAttribute("data-adapttable-part")).toBe(false);
    mask.click();
    await tick();
    expect(close).toHaveBeenCalledExactlyOnceWith("outside");
    expect(open.value).toBe(true);
    expect(document.documentElement.style.overflow).toBe("hidden");
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    expect(dialog.contains(document.activeElement)).toBe(true);
    outside.remove();
    view.stop();
    await tick();
    expect(document.documentElement.style.overflow).toBe(beforeOverflow);
    mask.click();
    expect(close).toHaveBeenCalledOnce();
  });

  it("dismisses through the vendor outside-click hook and preserves the new focus owner", async () => {
    const anchor = shallowRef<HTMLElement | null>(null);
    const receiveAnchor = (value: HTMLElement | null) => {
      anchor.value = value;
    };
    const open = shallowRef(false);
    const close = vi.fn(() => {
      open.value = false;
    });
    const view = mount(() =>
      h("div", [
        naiveButton(
          {
            ref: receiveAnchor,
            onClick: () => {
              open.value = true;
            },
          },
          "Filters"
        ),
        h(NaiveFilterSurface, {
          open: open.value,
          modal: false,
          dir: "ltr",
          label: "Filters",
          anchor: anchor.value,
          children: naiveButton({}, "Inside"),
          onClose: close,
        }),
        naiveButton({ "data-outside": "true" }, "Outside"),
      ])
    );
    find(view.host, "button").click();
    await tick();
    expect(find(document.body, part("filters-popover"))).toBeTruthy();
    const outside = find<HTMLButtonElement>(view.host, "[data-outside]");
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    outside.focus();
    outside.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    outside.click();
    await tick();
    await settle();
    expect(close).toHaveBeenCalledExactlyOnceWith("outside");
    expect(document.activeElement).toBe(outside);
    expect(document.body.querySelector(part("filters-popover"))).toBeNull();
    view.stop();
    document.body.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    expect(close).toHaveBeenCalledOnce();
  });

  it("handles Escape after focus leaves a nonmodal surface without interrupting composition", async () => {
    const anchor = shallowRef<HTMLElement | null>(null);
    const receiveAnchor = (value: HTMLElement | null) => {
      anchor.value = value;
    };
    const open = shallowRef(false);
    const close = vi.fn(() => {
      open.value = false;
    });
    const view = mount(() =>
      h("div", [
        naiveButton(
          {
            ref: receiveAnchor,
            onClick: () => {
              open.value = true;
            },
          },
          "Filters"
        ),
        h(NaiveFilterSurface, {
          open: open.value,
          modal: false,
          dir: "ltr",
          label: "Filters",
          anchor: anchor.value,
          children: naiveButton({}, "Inside"),
          onClose: close,
        }),
        naiveButton({ "data-outside": "true" }, "Outside"),
      ])
    );
    find(view.host, "button").click();
    await tick();
    const outside = find<HTMLButtonElement>(view.host, "[data-outside]");
    outside.focus();
    outside.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        isComposing: true,
        bubbles: true,
        cancelable: true,
      })
    );
    await tick();
    expect(close).not.toHaveBeenCalled();
    expect(open.value).toBe(true);
    await escape(outside);
    await settle();
    expect(close).toHaveBeenCalledExactlyOnceWith("escape");
    expect(document.activeElement).toBe(outside);
    view.stop();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
      })
    );
    expect(close).toHaveBeenCalledOnce();
  });
});
