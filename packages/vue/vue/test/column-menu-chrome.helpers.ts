/** Test-owned control slots for exercising binding structure and interactions. */
import {
  createApp,
  defineComponent,
  h,
  mergeProps,
  nextTick,
  type VNodeChild,
} from "vue";

import {
  ColumnMenuChrome,
  type ColumnMenuSlotProps,
  type ColumnMenuSlots,
  useColumnMenu,
} from "../src/column-menu";

export const testColumnMenuSlots: ColumnMenuSlots = {
  Trigger: ({ attrs, label }) => h("button", attrs, label),
  Button: ({ attrs, label }) => h("button", attrs, label),
  Input: ({ attrs, value, onChange }) =>
    h(
      "input",
      mergeProps(attrs, {
        value,
        onInput: (event: Event): void => {
          const target = event.currentTarget;
          if (target instanceof HTMLInputElement) onChange(target.value);
        },
      })
    ),
  Choice: ({ attrs, value, options, onChange }) =>
    h(
      "select",
      mergeProps(attrs, {
        value,
        onChange: (event: Event): void => {
          const target = event.currentTarget;
          if (!(target instanceof HTMLSelectElement)) return;
          onChange(target.value);
          target.value = value;
        },
      }),
      options.map((option) =>
        h("option", { value: option.value }, option.label)
      )
    ),
  Panel: ({ attrs, content }) => h("div", attrs, [content]),
};

export const TestColumnMenu = defineComponent(
  <TRow>(props: ColumnMenuSlotProps<TRow>) => {
    const model = useColumnMenu(() => props);
    return () => h(ColumnMenuChrome, { model, slots: testColumnMenuSlots });
  },
  {
    name: "TestColumnMenu",
    props: [
      "allColumns",
      "layout",
      "labels",
      "hasRowActions",
      "hasRowReorder",
      "onAutoSize",
      "onAutoSizeColumn",
      "onSortColumn",
      "onFilterColumn",
      "onRenameColumn",
      "sortBy",
      "sortDir",
      "dir",
      "groupingPanel",
      "featureHost",
      "classNames",
      "container",
    ],
  }
);

export function findControl<T extends Element>(
  root: ParentNode,
  selector: string
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}
export const part = (name: string): string =>
  `[data-adapttable-part="${name}"]`;
export function mountControl(render: () => VNodeChild) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(defineComponent({ setup: () => render }));
  app.mount(root);
  return {
    root,
    stop: (): void => {
      app.unmount();
      root.remove();
    },
  };
}
export async function clickControl(
  root: ParentNode,
  selector: string
): Promise<void> {
  findControl<HTMLElement>(root, selector).click();
  await nextTick();
}
export async function setText(
  root: ParentNode,
  selector: string,
  value: string
): Promise<void> {
  const input = findControl<HTMLInputElement>(root, selector);
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
}
export async function keyControl(
  element: EventTarget,
  key: string,
  composing = false
): Promise<void> {
  element.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      isComposing: composing,
    })
  );
  await nextTick();
}
