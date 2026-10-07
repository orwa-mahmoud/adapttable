import ui from "@nuxt/ui/vue-plugin";
import { afterEach } from "vitest";
import { createApp, nextTick, type VNodeChild } from "vue";
const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const stop of cleanup.splice(0)) stop();
});
export function mountNuxt(render: () => VNodeChild) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render }).use(ui);
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
  return { host, stop };
}
export function find<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string
): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error("Missing Nuxt control: " + selector);
  return node;
}
export const part = (name: string) => '[data-adapttable-part="' + name + '"]';
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
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
