import type { Attrs, ElementRef } from "@adapttable/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { headlessButton, headlessInput } from "../src/controls/basic";
import { headlessCheckbox } from "../src/controls/checkbox";
import { HeadlessSurface } from "../src/controls/HeadlessSurface";
import { headlessSelect } from "../src/controls/select";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  document.body.replaceChildren();
});

function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({ setup: () => render }));
  app.mount(host);
  let mounted = true;
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    app.unmount();
  };
  cleanups.push(unmount);
  return { host, unmount };
}

function surface(attrs: Attrs, modal: boolean) {
  return h(HeadlessSurface, {
    open: true,
    modal,
    label: "Filter controls",
    dir: "ltr",
    anchor: null,
    contentAttrs: attrs,
    children: headlessButton({}, "Done"),
    onClose: vi.fn(),
  });
}

const targets = [
  {
    name: "Primitive button",
    render: (attrs: Attrs) => headlessButton(attrs, "Action"),
  },
  {
    name: "Primitive input",
    render: (attrs: Attrs) =>
      headlessInput({ attrs, value: "", onChange: vi.fn() }),
  },
  {
    name: "CheckboxRoot",
    render: (attrs: Attrs) =>
      headlessCheckbox({ attrs, checked: false, onChange: vi.fn() }),
  },
  {
    name: "SelectTrigger",
    render: (attrs: Attrs) =>
      headlessSelect({
        attrs,
        value: "one",
        options: [{ value: "one", label: "One" }],
        onChange: vi.fn(),
      }),
  },
  { name: "PopoverContent", render: (attrs: Attrs) => surface(attrs, false) },
  { name: "DialogContent", render: (attrs: Attrs) => surface(attrs, true) },
];

describe("Headless native target ownership", () => {
  it.each(targets)(
    "reconciles callback replacement/removal and unchanged renders on $name",
    async ({ render }) => {
      const a = vi.fn<ElementRef>();
      const b = vi.fn<ElementRef>();
      const owner = shallowRef<ElementRef | undefined>(a);
      const revision = shallowRef(0);
      const { unmount } = mount(() =>
        render({
          ref: owner.value,
          "data-ref-target": "true",
          "data-revision": revision.value,
          "aria-label": "Target",
        })
      );
      await nextTick();
      const target = document.querySelector<HTMLElement>("[data-ref-target]");
      expect(target).toBeInstanceOf(HTMLElement);
      expect(a.mock.calls).toEqual([[target]]);
      revision.value++;
      await nextTick();
      expect(a.mock.calls).toEqual([[target]]);
      owner.value = b;
      await nextTick();
      expect(a.mock.calls).toEqual([[target], [null]]);
      expect(b.mock.calls).toEqual([[target]]);
      expect(document.querySelector("[data-ref-target]")).toBe(target);
      owner.value = undefined;
      await nextTick();
      expect(b.mock.calls).toEqual([[target], [null]]);
      revision.value++;
      await nextTick();
      expect(b.mock.calls).toEqual([[target], [null]]);
      owner.value = a;
      await nextTick();
      expect(a.mock.calls).toEqual([[target], [null], [target]]);
      unmount();
      expect(a.mock.calls).toEqual([[target], [null], [target], [null]]);
      await nextTick();
      expect(a.mock.calls).toEqual([[target], [null], [target], [null]]);
    }
  );

  it("reconciles a changed native root on the same Primitive instance", async () => {
    const owner = vi.fn<ElementRef>();
    const as = shallowRef("button");
    const { host, unmount } = mount(() =>
      headlessButton({ ref: owner, as: as.value }, "Action")
    );
    await nextTick();
    const button = host.querySelector("button");
    expect(owner.mock.calls).toEqual([[button]]);
    as.value = "a";
    await nextTick();
    const anchor = host.querySelector("a");
    expect(anchor).toBeInstanceOf(HTMLAnchorElement);
    expect(owner.mock.calls).toEqual([[button], [null], [anchor]]);
    unmount();
    expect(owner.mock.calls).toEqual([[button], [null], [anchor], [null]]);
  });

  it("does not acquire the replacement owner after synchronous disposal by the old owner", async () => {
    const b = vi.fn<ElementRef>();
    let dispose: () => void = () => undefined;
    const a = vi.fn<ElementRef>((target) => {
      if (!target) dispose();
    });
    const owner = shallowRef<ElementRef>(a);
    const mounted = mount(() => headlessButton({ ref: owner.value }, "Action"));
    dispose = mounted.unmount;
    await nextTick();
    const button = mounted.host.querySelector("button");
    owner.value = b;
    await nextTick();
    expect(a.mock.calls).toEqual([[button], [null]]);
    expect(b).not.toHaveBeenCalled();
    expect(mounted.host.children).toHaveLength(0);
  });
});
