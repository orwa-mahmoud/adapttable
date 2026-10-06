import type { ElementRef } from "@adapttable/vue";
import { h } from "vue";

import {
  QuasarButton,
  QuasarCheckbox,
  QuasarInput,
  QuasarSelect,
} from "../src/controls";

/** Identical controls for the real Node SSR render and client hydration. */
export function controlsFixture(
  value: string,
  checked: boolean,
  target: ElementRef<Element> = () => undefined
) {
  return h("div", { dir: "rtl" }, [
    h(QuasarInput, {
      control: {
        value,
        label: "Query",
        attrs: {
          id: "query",
          "data-adapttable-part": "filter-input",
          ref: target,
        },
        onChange: () => undefined,
      },
    }),
    h(QuasarSelect, {
      control: {
        value,
        label: "Choice",
        attrs: {
          id: "choice",
          "data-adapttable-part": "filter-select",
          ref: target,
        },
        options: [{ value, label: value }],
        onChange: () => undefined,
      },
    }),
    h(QuasarCheckbox, {
      control: {
        checked,
        label: value,
        attrs: { "data-adapttable-part": "row-select", ref: target },
        onChange: () => undefined,
      },
    }),
    h(QuasarButton, {
      attrs: { "data-adapttable-part": "fullscreen-toggle", ref: target },
      label: "Fullscreen",
    }),
  ]);
}
