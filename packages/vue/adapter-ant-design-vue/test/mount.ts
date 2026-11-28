import { afterEach } from "vitest";
import { createApp, type VNodeChild } from "vue";

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));
export function mount(render: () => VNodeChild) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({ render });
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
/**
 * jsdom never runs CSS transitions, so a leaving Ant Design Vue surface waits
 * for an end event that does not arrive. This ends every running leave motion.
 */
export function finishMotion(): void {
  for (const element of document.querySelectorAll('[class*="-leave-active"]')) {
    element.dispatchEvent(new Event("transitionend", { bubbles: true }));
    element.dispatchEvent(new Event("animationend", { bubbles: true }));
  }
}
