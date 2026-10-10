import type { FilterFormSource } from "@adapttable/vue";
import {
  type DataTableClassNames,
  provideDataTableClassNames,
} from "@adapttable/vue/adapter";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import {
  computed,
  createApp,
  defineComponent,
  nextTick,
  shallowRef,
  type VNodeChild,
} from "vue";

export interface Row {
  id: string;
  name: string;
  active: boolean;
  amount: number;
}
export const rows: readonly Row[] = [
  { id: "ada", name: "Ada", active: true, amount: 2 },
  { id: "grace", name: "Grace", active: false, amount: 3 },
];
const cleanups = new Set<() => void>();
const scrollDescriptor = Object.getOwnPropertyDescriptor(
  Element.prototype,
  "scrollTo"
);
// jsdom has no media-query evaluator. These interaction tests use a fine pointer.
beforeAll(() => {
  vi.stubGlobal("matchMedia", (media: string) => ({
    media,
    matches: false,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  }));
  // jsdom stores scroll positions but does not implement the scrollTo method.
  Object.defineProperty(Element.prototype, "scrollTo", {
    configurable: true,
    value(this: Element, options: ScrollToOptions | number, y?: number) {
      const top = typeof options === "number" ? y : options.top;
      const left = typeof options === "number" ? options : options.left;
      if (top !== undefined) this.scrollTop = top;
      if (left !== undefined) this.scrollLeft = left;
      this.dispatchEvent(new Event("scroll"));
    },
  });
});
afterAll(() => {
  vi.unstubAllGlobals();
  if (scrollDescriptor)
    Object.defineProperty(Element.prototype, "scrollTo", scrollDescriptor);
  else Reflect.deleteProperty(Element.prototype, "scrollTo");
});
afterEach(() => {
  for (const cleanup of cleanups) cleanup();
});
export function mount(
  render: () => VNodeChild,
  names: DataTableClassNames = {}
) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(
    defineComponent({
      setup() {
        provideDataTableClassNames(() => names);
        return render;
      },
    })
  );
  app.mount(host);
  const stop = () => {
    app.unmount();
    host.remove();
    cleanups.delete(stop);
  };
  cleanups.add(stop);
  return { host, stop };
}
export function source(accept = true) {
  const extra = shallowRef<FilterFormSource<Row>["extra"]>({});
  const setExtra = vi.fn<FilterFormSource<Row>["setExtra"]>((key, value) => {
    if (accept) extra.value = { ...extra.value, [key]: value };
  });
  const setExtras = vi.fn<FilterFormSource<Row>["setExtras"]>((patch) => {
    if (accept) extra.value = { ...extra.value, ...patch };
  });
  return {
    extra,
    setExtra,
    setExtras,
    value: computed<FilterFormSource<Row>>(() => ({
      extra: extra.value,
      setExtra,
      setExtras,
      allFilteredRows: rows,
    })),
  };
}
export function part(name: string) {
  return `[data-adapttable-part="${name}"]`;
}
export function find<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string
): T {
  const target = root.querySelector<T>(selector);
  if (!target) throw new Error(`Missing Naive target ${selector}`);
  return target;
}
export async function tick() {
  await nextTick();
  await Promise.resolve();
  await nextTick();
}
export async function write(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  await tick();
}
export async function choose(root: ParentNode, label: string) {
  find<HTMLInputElement>(root, 'input[role="combobox"]').click();
  await tick();
  // Give the real vendor ResizeObserver a measurable jsdom viewport.
  const list = find(root, ".n-virtual-list");
  list.style.height = "240px";
  list.style.width = "240px";
  Object.defineProperties(list, {
    offsetHeight: { configurable: true, value: 240 },
    offsetWidth: { configurable: true, value: 240 },
    clientHeight: { configurable: true, value: 240 },
    clientWidth: { configurable: true, value: 240 },
  });
  const option = await vi.waitFor(() => {
    const found = [
      ...root.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((node) => node.textContent?.trim() === label);
    if (!found) throw new Error(`Missing Naive option ${label}`);
    return found;
  });
  option.click();
  await tick();
}
export async function escape(target: Element) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  await tick();
}
export async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 350));
  await tick();
}
