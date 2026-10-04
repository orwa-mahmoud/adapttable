import { resolveLabels } from "@adapttable/core";
import { expect, it, vi } from "vitest";
import { createSSRApp, effectScope, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { FilterFieldChrome, useFilterField } from "../src/filters";

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
