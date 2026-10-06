import type { FilterDef, FilterFormSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { computed, createSSRApp, defineComponent, h, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import { provideClassNames } from "../src/classNamesContext";
import { NativeFilterField } from "../src/filters/NativeFilterField";
import { NativeHeaderFilter } from "../src/filters/NativeHeaderFilter";
import type { DataTableClassNames } from "../src/types";
import {
  click,
  find,
  mountNative,
  part,
  tick,
  write,
} from "./filter-editing-helpers";

interface Row {
  name: string;
}
const labels = resolveLabels(undefined);
const classNames: DataTableClassNames = {
  filterField: "field",
  filterLabel: "caption",
  filterControl: "control",
  filterOperator: "operator",
  filterSelect: "choice",
  filterCheckboxGroup: "choices",
  filterCheckbox: "checkbox",
};
const choices = [
  { value: "ada", label: "Ada Lovelace" },
  { value: "grace", label: "Grace Hopper" },
];
function source() {
  const extra = shallowRef<FilterFormSource<Row>["extra"]>({});
  const setExtra = vi.fn<FilterFormSource<Row>["setExtra"]>((key, value) => {
    extra.value = { ...extra.value, [key]: value };
  });
  const setExtras = vi.fn<FilterFormSource<Row>["setExtras"]>((patch) => {
    extra.value = { ...extra.value, ...patch };
  });
  const value = computed(() => ({ extra: extra.value, setExtra, setExtras }));
  return { value, extra, setExtra, setExtras };
}
function assertPart(
  root: ParentNode,
  name: string,
  tag: string,
  className: string
) {
  const first = find<HTMLElement>(root, part(name));
  for (const element of root.querySelectorAll(part(name))) {
    expect(element.tagName, name).toBe(tag);
    expect(element.className, name).toBe(className);
  }
  return first;
}
function assertGroup(root: ParentNode) {
  const field = assertPart(root, "filter-field", "DIV", "field");
  const caption = assertPart(field, "filter-label", "SPAN", "caption");
  const group = assertPart(field, "filter-checkbox-group", "DIV", "choices");
  expect(group.parentElement).toBe(field);
  expect(group.getAttribute("role")).toBe("group");
  expect(group.getAttribute("aria-labelledby")).toBe(caption.id);
  expect(caption.textContent).toBe("Name");
  const checkbox = assertPart(group, "filter-checkbox", "LABEL", "checkbox");
  const input = find<HTMLInputElement>(checkbox, "input");
  const checkboxes = [...group.querySelectorAll(part("filter-checkbox"))];
  expect(checkboxes).toHaveLength(choices.length);
  for (const [index, option] of checkboxes.entries()) {
    const choice = choices[index]!;
    const control = find<HTMLInputElement>(option, "input");
    expect(control.type).toBe("checkbox");
    expect(control.id).toContain(`-${choice.value}`);
    expect(control.getAttribute("aria-label")).toBe(choice.label);
    expect(control.hasAttribute("data-adapttable-part")).toBe(false);
    expect(option.textContent).toBe(choice.label);
  }
  expect(group.querySelectorAll(".control")).toHaveLength(choices.length);
  return { group, input, checkbox };
}

describe("canonical native filter classes and parts", () => {
  it.each(["text", "numberRange", "dateRange"] as const)(
    "puts %s operator hooks on its native select in SSR and interactive fields",
    async (type) => {
      const state = source();
      const render = () =>
        h(NativeFilterField<Row>, {
          id: `field-${type}`,
          def: { key: "name", type },
          source: state.value.value,
          labels,
        });
      const Root = defineComponent({
        setup() {
          provideClassNames(() => classNames);
          return render;
        },
      });
      const markup = document.createElement("div");
      markup.innerHTML = await renderToString(createSSRApp(Root));
      const serverOperator = assertPart(
        markup,
        "filter-operator",
        "SELECT",
        "operator"
      );
      expect(serverOperator.id).toBe(`field-${type}-operator`);
      expect(serverOperator.getAttribute("aria-label")).toBe(labels.operator);
      expect(markup.querySelector(part("filter-select"))).toBeNull();
      const view = mountNative(render, classNames);
      const operator = assertPart(
        view.host,
        "filter-operator",
        "SELECT",
        "operator"
      ) as HTMLSelectElement;
      const next = { text: "empty", numberRange: "eq", dateRange: "on" }[type];
      await write(operator, next, "change");
      expect(state.setExtras).toHaveBeenCalledOnce();
      expect(operator.value).toBe(next);
    }
  );

  it.each(["select", "boolean"] as const)(
    "keeps %s value selects on their own hook",
    (type) => {
      const state = source();
      const view = mountNative(
        () =>
          h(NativeFilterField<Row>, {
            def: { key: "name", type, options: choices },
            source: state.value.value,
            labels,
          }),
        classNames
      );
      assertPart(view.host, "filter-select", "SELECT", "choice");
      expect(view.host.querySelector(part("filter-operator"))).toBeNull();
    }
  );

  it("groups native checkbox labels in SSR and preserves their actual input behavior", async () => {
    const state = source();
    const render = () =>
      h(NativeFilterField<Row>, {
        def: { key: "name", type: "multiSelect", options: choices },
        source: state.value.value,
        labels,
      });
    const Root = defineComponent({
      setup() {
        provideClassNames(() => classNames);
        return render;
      },
    });
    const markup = document.createElement("div");
    markup.innerHTML = await renderToString(createSSRApp(Root));
    assertGroup(markup);
    const serverChoices = markup.querySelectorAll(part("filter-checkbox"));
    serverChoices[1]!.classList.remove("checkbox");
    expect(() => assertGroup(markup)).toThrow();
    const view = mountNative(render, classNames);
    const { checkbox, input } = assertGroup(view.host);
    checkbox.click();
    await tick();
    expect(input.checked).toBe(true);
    expect(state.setExtra).toHaveBeenCalledExactlyOnceWith("name", ["ada"]);
    checkbox.click();
    await tick();
    expect(input.checked).toBe(false);
    expect(state.setExtra).toHaveBeenLastCalledWith("name", []);
    expect(state.setExtra).toHaveBeenCalledTimes(2);
  });

  it("renders the checkbox group even with no options and removes it when the field changes kind", async () => {
    const state = source();
    const def = shallowRef<FilterDef<Row>>({
      key: "name",
      type: "multiSelect",
      options: [],
    });
    const view = mountNative(
      () =>
        h(NativeFilterField<Row>, {
          def: def.value,
          source: state.value.value,
          labels,
        }),
      classNames
    );
    const group = assertPart(
      view.host,
      "filter-checkbox-group",
      "DIV",
      "choices"
    );
    expect(group.children).toHaveLength(0);
    def.value = { key: "name", type: "select", options: choices };
    await tick();
    expect(view.host.querySelector(part("filter-checkbox-group"))).toBeNull();
    assertPart(view.host, "filter-select", "SELECT", "choice");
  });

  it("uses the same canonical hooks through real header filter controls", async () => {
    const state = source();
    const definition = shallowRef<FilterDef<Row>>({
      key: "name",
      type: "text",
    });
    const view = mountNative(
      () =>
        h(NativeHeaderFilter<Row>, {
          def: definition.value,
          source: state.value.value,
          labels,
        }),
      classNames
    );
    await click(view.host, "filter-header-trigger");
    const surface = find(document.body, part("filter-header-popover"));
    const operator = assertPart(
      surface,
      "filter-operator",
      "SELECT",
      "operator"
    ) as HTMLSelectElement;
    await write(operator, "startsWith", "change");
    expect(state.setExtras).toHaveBeenCalledOnce();
    definition.value = { key: "name", type: "multiSelect", options: choices };
    await tick();
    const { input } = assertGroup(surface);
    input.click();
    await tick();
    expect(input.checked).toBe(true);
    expect(state.setExtra).toHaveBeenCalledExactlyOnceWith("name", ["ada"]);
  });
});
