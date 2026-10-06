import {
  createApp,
  createSSRApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import type { ElementRef } from "../src/attrs";
import { useElementRef } from "../src/useElementRef";

it("rejects resource registration outside an owning scope", () => {
  const target = vi.fn(() => null);
  const owner = vi.fn(() => undefined);
  expect(() => useElementRef(target, owner)).toThrow(
    "useElementRef must run inside setup() or an active effectScope()."
  );
  expect(target).not.toHaveBeenCalled();
  expect(owner).not.toHaveBeenCalled();
});

it("releases the old callback before attaching the new callback", async () => {
  const target = document.createElement("article");
  const calls: string[] = [];
  const first: ElementRef = (value) =>
    calls.push(`first:${value?.tagName ?? "null"}`);
  const second: ElementRef = (value) =>
    calls.push(`second:${value?.tagName ?? "null"}`);
  const owner = shallowRef(first);
  const scope = effectScope();
  scope.run(() =>
    useElementRef(
      () => target,
      () => owner.value
    )
  );
  owner.value = second;
  await nextTick();
  expect(calls).toEqual(["first:ARTICLE", "first:null", "second:ARTICLE"]);
  scope.stop();
  expect(calls.at(-1)).toBe("second:null");
});

it("releases once when the initial callback stops its owning scope", async () => {
  const target = document.createElement("button");
  const scope = effectScope();
  const callback = vi.fn<ElementRef>((value) => {
    if (value !== null) scope.stop();
  });
  scope.run(() =>
    useElementRef(
      () => target,
      () => callback
    )
  );
  await nextTick();
  scope.stop();
  expect(callback.mock.calls).toEqual([[target], [null]]);
});

it("uses the latest callback after the retiring owner changes it", async () => {
  const target = document.createElement("button");
  const final = vi.fn<ElementRef>();
  const intermediate = vi.fn<ElementRef>();
  const owner = shallowRef<ElementRef>();
  const first = vi.fn<ElementRef>((value) => {
    if (value === null) owner.value = final;
  });
  owner.value = first;
  const scope = effectScope();
  scope.run(() =>
    useElementRef(
      () => target,
      () => owner.value
    )
  );
  owner.value = intermediate;
  await nextTick();
  expect(first.mock.calls).toEqual([[target], [null]]);
  expect(intermediate).not.toHaveBeenCalled();
  expect(final.mock.calls).toEqual([[target]]);
  scope.stop();
  expect(final.mock.calls).toEqual([[target], [null]]);
});

it("releases on callback removal and reattaches on restoration", async () => {
  const callback = vi.fn<ElementRef>();
  const target = document.createElement("div");
  const owner = shallowRef<ElementRef | undefined>(callback);
  const scope = effectScope();
  scope.run(() =>
    useElementRef(
      () => target,
      () => owner.value
    )
  );
  owner.value = undefined;
  await nextTick();
  expect(callback.mock.calls).toEqual([[target], [null]]);
  owner.value = callback;
  await nextTick();
  expect(callback.mock.calls).toEqual([[target], [null], [target]]);
  scope.stop();
  expect(callback.mock.calls).toEqual([[target], [null], [target], [null]]);
});

it("releases a replaced native target before attaching the replacement", async () => {
  const first = document.createElement("button");
  const second = document.createElement("span");
  const target = shallowRef<HTMLElement | null>(first);
  const callback = vi.fn<ElementRef>();
  const scope = effectScope();
  scope.run(() =>
    useElementRef(
      () => target.value,
      () => callback
    )
  );
  target.value = second;
  await nextTick();
  expect(callback.mock.calls).toEqual([[first], [null], [second]]);
  target.value = null;
  await nextTick();
  scope.stop();
  expect(callback.mock.calls).toEqual([[first], [null], [second], [null]]);
});

it("does not publish a queued replacement after scope disposal", async () => {
  const first = vi.fn<ElementRef>();
  const second = vi.fn<ElementRef>();
  const target = document.createElement("button");
  const owner = shallowRef(first);
  const scope = effectScope();
  scope.run(() =>
    useElementRef(
      () => target,
      () => owner.value
    )
  );
  owner.value = second;
  scope.stop();
  await nextTick();
  expect(first.mock.calls).toEqual([[target], [null]]);
  expect(second).not.toHaveBeenCalled();
});

it("reconciles public roots after updates and stays stable on unchanged renders", async () => {
  const tag = shallowRef("button");
  const label = shallowRef("first");
  const callback = vi.fn<ElementRef>();
  const vendor = defineComponent({
    props: { tag: String, label: String },
    setup: (props) => () => h(props.tag ?? "button", props.label),
  });
  const wrapper = defineComponent({
    setup() {
      const instance = shallowRef<InstanceType<typeof vendor> | null>(null);
      useElementRef(
        () => {
          const element: unknown = instance.value?.$el;
          return element instanceof HTMLElement ? element : null;
        },
        () => callback
      );
      return () =>
        h(vendor, { ref: instance, tag: tag.value, label: label.value });
    },
  });
  const host = document.createElement("div");
  const app = createApp(wrapper);
  app.mount(host);
  await nextTick();
  const first = host.firstElementChild;
  label.value = "second";
  await nextTick();
  expect(callback.mock.calls).toEqual([[first]]);
  tag.value = "span";
  await nextTick();
  const second = host.firstElementChild;
  expect(second?.tagName).toBe("SPAN");
  expect(callback.mock.calls).toEqual([[first], [null], [second]]);
  app.unmount();
  expect(callback.mock.calls).toEqual([[first], [null], [second], [null]]);
});

it("accepts an absent SSR target without publishing a native node", async () => {
  const callback = vi.fn<ElementRef>();
  const app = createSSRApp(
    defineComponent({
      setup() {
        useElementRef(
          () => null,
          () => callback
        );
        return () => h("article", "Server");
      },
    })
  );
  expect(await renderToString(app)).toBe("<article>Server</article>");
  expect(callback).not.toHaveBeenCalled();
});
