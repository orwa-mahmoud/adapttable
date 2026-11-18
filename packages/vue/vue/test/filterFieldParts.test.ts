import { resolveLabels } from "@adapttable/core";
import { expect, it, vi } from "vitest";
import { createSSRApp, effectScope, h } from "vue";
import { renderToString } from "vue/server-renderer";

import {
  defaultFilterRegistry,
  FilterFieldChrome,
  filterWidgetComponent,
  multiSelectFieldPart,
  textFieldPart,
  useFilterField,
  useFilterFieldWith,
} from "../src/adapter";

it("shares checkbox group structure and complete control attributes with any kit", async () => {
  const scope = effectScope();
  const setExtra = vi.fn();
  const model = scope.run(() =>
    useFilterField({
      id: "people",
      def: {
        key: "name",
        type: "multiSelect",
        options: [{ value: "ada", label: "Ada Lovelace" }],
      },
      labels: resolveLabels(undefined),
      source: { extra: {}, setExtra, setExtras: vi.fn() },
    })
  )!;
  const control = model.value.controls[0]!;
  expect(control.props.attrs).toEqual({
    id: "people-ada",
    "aria-label": "Ada Lovelace",
    "data-adapttable-part": "filter-checkbox",
  });
  const html = await renderToString(
    createSSRApp({
      render: () =>
        FilterFieldChrome({
          model: model.value,
          classNames: { filterCheckboxGroup: "kit-group" },
          controls: {
            Input: (props) => h("i", props.attrs, props.value),
            Select: (props) => h("b", props.attrs, props.value),
            Checkbox: (props) => h("u", props.attrs, props.label),
          },
        }),
    })
  );
  const root = document.createElement("div");
  root.innerHTML = html;
  const group = root.querySelector(
    '[data-adapttable-part="filter-checkbox-group"]'
  )!;
  expect(group.className).toBe("kit-group");
  expect(group.getAttribute("aria-labelledby")).toBe("people");
  expect(
    group.querySelector('u[data-adapttable-part="filter-checkbox"]')
      ?.textContent
  ).toBe("Ada Lovelace");
  expect(root.querySelector("input, select, button")).toBeNull();
  if (control.kind !== "checkbox") throw new Error("Expected checkbox slot");
  control.props.onChange(true);
  expect(setExtra).toHaveBeenCalledExactlyOnceWith("name", ["ada"]);
  scope.stop();
});

it("draws a field with only the parts it was composed with", () => {
  const scope = effectScope();
  const source = { extra: {}, setExtra: vi.fn(), setExtras: vi.fn() };
  const labels = resolveLabels(undefined);
  const text = scope.run(() =>
    useFilterFieldWith(
      { id: "q", def: { key: "q", type: "text" }, labels, source },
      [textFieldPart]
    )
  )!;
  expect(text.value.controls.map((control) => control.key)).toEqual([
    "operator",
    "value",
  ]);
  const status = scope.run(() =>
    useFilterFieldWith(
      { id: "status", def: { key: "status", type: "select" }, labels, source },
      [textFieldPart]
    )
  )!;
  expect(() => status.value).toThrow(
    'filter type "select" needs a registered adapter field renderer'
  );
  scope.stop();
});

it("keeps the checkbox group while multi-select options load", () => {
  const scope = effectScope();
  const model = scope.run(() =>
    useFilterFieldWith(
      {
        id: "tags",
        def: {
          key: "tags",
          type: "multiSelect",
          options: () => new Promise<never>(() => undefined),
        },
        labels: resolveLabels(undefined),
        source: { extra: {}, setExtra: vi.fn(), setExtras: vi.fn() },
      },
      [multiSelectFieldPart]
    )
  )!;
  expect(model.value.loading).toBe(true);
  expect(model.value.checkboxGroupAttrs).toMatchObject({ role: "group" });
  scope.stop();
});

it("names the filter type a panel has no widget for", () => {
  const text = { kinds: ["text"] as const, render: { name: "TextField" } };
  expect(
    filterWidgetComponent({ key: "q", type: "text" }, defaultFilterRegistry, [
      text,
    ])
  ).toBe(text.render);
  expect(() =>
    filterWidgetComponent(
      { key: "status", type: "select" },
      defaultFilterRegistry,
      [text]
    )
  ).toThrow(
    'filter "status" of type "select" draws the "select" widget, which this filters feature was not composed with'
  );
});
