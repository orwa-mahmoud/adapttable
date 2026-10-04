import { afterEach } from "vitest";
import {
  type Component,
  createApp,
  defineComponent,
  h,
  nextTick,
  type VNodeChild,
} from "vue";

import { provideClassNames } from "../src/classNamesContext";
import type { DataTableClassNames } from "../src/types";

const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const dispose of cleanup.splice(0)) dispose();
});
export function mountNative(
  render: () => VNodeChild,
  classNames: DataTableClassNames = {}
) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(
    defineComponent({
      setup() {
        provideClassNames(() => classNames);
        return render;
      },
    })
  );
  app.mount(host);
  let stopped = false;
  const stop = () => {
    if (!stopped) {
      stopped = true;
      app.unmount();
      host.remove();
    }
  };
  cleanup.push(stop);
  return { host, app, stop };
}
export function mountComponent(component: Component) {
  return mountNative(() => h(component));
}
export function find<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string
): T {
  const result = root.querySelector<T>(selector);
  if (!result) throw new Error(`Missing native control: ${selector}`);
  return result;
}
export function part(name: string) {
  return `[data-adapttable-part="${name}"]`;
}
export async function tick() {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
  await nextTick();
}
export async function click(root: ParentNode, name: string) {
  find(root, part(name)).click();
  await tick();
}
export async function write(
  input: HTMLInputElement | HTMLSelectElement,
  value: string,
  event = "input"
) {
  input.value = value;
  input.dispatchEvent(new Event(event, { bubbles: true }));
  await tick();
}
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
