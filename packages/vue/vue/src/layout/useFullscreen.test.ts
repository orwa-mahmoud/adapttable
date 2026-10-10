import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  effectScope,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { useFullscreen } from "./useFullscreen";
async function settleRequests(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
function fixture(doc = document) {
  let element: Element | null = null;
  Object.defineProperty(doc, "fullscreenEnabled", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(doc, "fullscreenElement", {
    configurable: true,
    get: () => element,
  });
  const exit = vi.fn(() => {
    element = null;
    doc.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  });
  Object.defineProperty(doc, "exitFullscreen", {
    configurable: true,
    value: exit,
  });
  const root = doc.createElement("div");
  const request = vi.fn(() => {
    element = root;
    doc.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  });
  root.requestFullscreen = request;
  return {
    root,
    request,
    exit,
    set: (next: Element | null) => {
      element = next;
      doc.dispatchEvent(new Event("fullscreenchange"));
    },
  };
}
function mountScope(
  root: ReturnType<typeof shallowRef<HTMLElement | null>>,
  active = shallowRef(true)
) {
  const scope = effectScope();
  const state = scope.run(() => useFullscreen(root, active));
  if (!state) throw new Error("state missing");
  return { state, stop: () => scope.stop() };
}
describe("Vue fullscreen", () => {
  it("uses the document as truth and only exits its own table", async () => {
    const f = fixture();
    const one = mountScope(shallowRef(f.root));
    expect(one.state.value).toMatchObject({
      active: false,
      supported: true,
      container: undefined,
    });
    one.state.value.toggle();
    await settleRequests();
    expect(one.state.value.active).toBe(true);
    expect(one.state.value.container).toBe(f.root);
    one.state.value.toggle();
    await settleRequests();
    expect(one.state.value.active).toBe(false);
    f.set(document.createElement("video"));
    one.state.value.exit();
    expect(f.exit).toHaveBeenCalledTimes(1);
    f.set(f.root);
    one.state.value.exit();
    await settleRequests();
    expect(f.exit).toHaveBeenCalledTimes(2);
    one.stop();
    one.state.value.toggle();
    expect(f.request).toHaveBeenCalledTimes(1);
  });
  it("uses a cross-document root ownerDocument and follows browser Escape", async () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("iframe document missing");
    const f = fixture(doc);
    const main = fixture();
    const one = mountScope(shallowRef(f.root));
    one.state.value.toggle();
    await settleRequests();
    expect(one.state.value.active).toBe(true);
    expect(main.request).not.toHaveBeenCalled();
    f.set(null);
    expect(one.state.value.active).toBe(false);
    one.stop();
    iframe.remove();
  });
  it("ignores duplicate pending gestures and catches request/exit rejections and throws", async () => {
    const f = fixture();
    let done: (() => void) | undefined;
    f.request.mockImplementation(
      () =>
        new Promise((resolve) => {
          done = resolve;
        })
    );
    const one = mountScope(shallowRef(f.root));
    one.state.value.toggle();
    one.state.value.toggle();
    expect(f.request).toHaveBeenCalledTimes(1);
    done?.();
    await settleRequests();
    f.request.mockRejectedValue(new Error("denied"));
    one.state.value.toggle();
    await settleRequests();
    expect(one.state.value.active).toBe(false);
    f.request.mockImplementation(() => {
      throw new Error("sync refusal");
    });
    one.state.value.toggle();
    f.set(f.root);
    f.exit.mockRejectedValue(new Error("exit denied"));
    one.state.value.exit();
    await settleRequests();
    expect(one.state.value.active).toBe(true);
    f.exit.mockImplementation(() => {
      throw new Error("sync exit refused");
    });
    one.state.value.exit();
    one.stop();
  });
  it("retires asynchronous entry after target replacement or disposal", async () => {
    const f = fixture();
    let done: (() => void) | undefined;
    f.request.mockImplementation(
      () =>
        new Promise((resolve) => {
          done = () => {
            f.set(f.root);
            resolve();
          };
        })
    );
    const root = shallowRef<HTMLElement | null>(f.root);
    const one = mountScope(root);
    one.state.value.toggle();
    root.value = null;
    done?.();
    await settleRequests();
    expect(f.exit).toHaveBeenCalledTimes(1);
    expect(one.state.value.active).toBe(false);
    root.value = f.root;
    one.state.value.toggle();
    one.stop();
    done?.();
    await settleRequests();
    expect(f.exit).toHaveBeenCalledTimes(2);
    expect(one.state.value.active).toBe(false);
  });
  it("does not attach browser resources on SSR, unsupported documents, or null roots", async () => {
    const f = fixture();
    Object.defineProperty(document, "fullscreenEnabled", {
      configurable: true,
      value: false,
    });
    const one = mountScope(shallowRef(f.root));
    one.state.value.toggle();
    expect(f.request).not.toHaveBeenCalled();
    one.stop();
    const nullRoot = mountScope(shallowRef(null));
    expect(nullRoot.state.value.supported).toBe(false);
    nullRoot.stop();
    const Component = defineComponent({
      setup() {
        const state = useFullscreen(shallowRef(f.root));
        return () => h("p", String(state.value.supported));
      },
    });
    expect(await renderToString(createSSRApp(Component))).toBe("<p>false</p>");
  });
  it("suspends and resumes KeepAlive ownership without duplicating listeners", async () => {
    const f = fixture();
    const show = shallowRef(true);
    let state: ReturnType<typeof useFullscreen> | undefined;
    const Child = defineComponent({
      setup() {
        state = useFullscreen(shallowRef(f.root));
        return () => h("p");
      },
    });
    const app = createApp({
      render: () =>
        h(KeepAlive, null, {
          default: () => (show.value ? h(Child) : h("span")),
        }),
    });
    app.mount(document.createElement("div"));
    await nextTick();
    state?.value.toggle();
    await settleRequests();
    show.value = false;
    await nextTick();
    expect(f.exit).toHaveBeenCalledTimes(1);
    expect(state?.value.supported).toBe(false);
    show.value = true;
    await nextTick();
    expect(state?.value.supported).toBe(true);
    app.unmount();
  });
});
