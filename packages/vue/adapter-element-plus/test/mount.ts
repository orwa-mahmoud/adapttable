import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { afterEach } from "vitest";
import { createApp, type VNodeChild } from "vue";

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));
export function mount(render: () => VNodeChild) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({ render });
  app.provide(ID_INJECTION_KEY, { prefix: 4300, current: 0 });
  app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
  app.mount(root);
  let mounted = true;
  const unmount = () => {
    if (mounted) {
      app.unmount();
      root.remove();
      mounted = false;
    }
  };
  cleanups.push(unmount);
  return { root, unmount };
}
export function node<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}
