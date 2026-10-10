import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import {
  ContextMenuChrome,
  type ContextMenuPresentation,
  type ContextMenuPresentationProps,
} from "../src/actions/contextMenuChrome";

const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
async function tick() {
  await nextTick();
  await nextTick();
}
function fixture(rejectClose = false) {
  const ran = vi.fn();
  const disabled = vi.fn();
  const at = shallowRef<{ x: number; y: number } | null>({ x: 13, y: 21 });
  const items = shallowRef([
    { key: "first", label: "First", onSelect: ran },
    { key: "disabled", label: "Disabled", disabled: true, onSelect: disabled },
  ]);
  const shown = shallowRef(true);
  const projections: ContextMenuPresentationProps[] = [];
  const closed = vi.fn(() => {
    if (!rejectClose) at.value = null;
  });
  const closeOwner = shallowRef(closed);
  const driver = shallowRef<ContextMenuPresentation>((props) => {
    projections.push(props);
    return h(
      "div",
      { role: "menu", "aria-label": props.label },
      props.items.map(({ item, onSelect }) =>
        h(
          "button",
          {
            disabled: item.disabled,
            onClick: onSelect,
          },
          item.label
        )
      )
    );
  });
  const className = shallowRef("first-style");
  const container = document.createElement("section");
  document.body.append(container);
  const Child = defineComponent(
    () => () =>
      h(ContextMenuChrome, {
        at: at.value,
        items: items.value,
        onClose: closeOwner.value,
        labels: { contextMenu: "Actions" },
        className: className.value,
        container,
        presentation: driver.value,
      })
  );
  const app = createApp(() =>
    h(KeepAlive, null, {
      default: () => (shown.value ? h(Child) : h("span")),
    })
  );
  app.mount(container);
  let live = true;
  const stop = () => {
    if (live) {
      live = false;
      app.unmount();
      container.remove();
    }
  };
  stops.push(stop);
  return {
    at,
    items,
    shown,
    projections,
    closed,
    closeOwner,
    driver,
    ran,
    disabled,
    className,
    container,
    stop,
  };
}

it("projects native menu items and the anchor without drawing controls", async () => {
  const f = fixture();
  await tick();
  const current = f.projections.at(-1)!;
  expect(current.at).toEqual({ x: 13, y: 21 });
  expect(current.anchorRef.current).toBe(
    f.container.querySelector('[data-adapttable-part="context-menu-anchor"]')
  );
  expect(current.container).toBe(f.container);
  expect(current.label).toBe("Actions");
  expect(current.className).toBe("first-style");
  expect(current.items.map(({ item }) => item)).toEqual(f.items.value);
  expect(current.isCurrent()).toBe(true);
  current.items[1]!.onSelect();
  await tick();
  expect(f.disabled).not.toHaveBeenCalled();
  expect(f.closed).not.toHaveBeenCalled();
  current.items[0]!.onSelect();
  current.items[0]!.onSelect();
  await tick();
  expect(f.closed).toHaveBeenCalledTimes(1);
  expect(f.ran).toHaveBeenCalledTimes(1);
  expect(current.isCurrent()).toBe(false);
});

it.each([
  "anchor",
  "items",
  "presentation",
  "owner",
  "inactive",
  "disposed",
] as const)(
  "retires native presentation callbacks after %s replacement",
  async (change) => {
    const f = fixture();
    await tick();
    const current = f.projections.at(-1)!;
    if (change === "anchor") f.at.value = { x: 34, y: 55 };
    if (change === "items") f.items.value = [...f.items.value];
    if (change === "presentation") {
      const previous = f.driver.value;
      f.driver.value = (props) => previous(props);
    }
    if (change === "owner") f.closeOwner.value = vi.fn();
    if (change === "inactive") f.shown.value = false;
    if (change === "disposed") f.stop();
    await tick();
    expect(current.isCurrent()).toBe(false);
    current.items[0]!.onSelect();
    current.onClose();
    await tick();
    expect(f.ran).not.toHaveBeenCalled();
    expect(f.closed).not.toHaveBeenCalled();
  }
);

it("keeps a captured native presentation through style updates", async () => {
  const f = fixture();
  await tick();
  const current = f.projections.at(-1)!;
  f.className.value = "new-style";
  await tick();
  expect(current.isCurrent()).toBe(true);
  expect(f.projections.at(-1)!.className).toBe("new-style");
  current.items[0]!.onSelect();
  await tick();
  expect(f.ran).toHaveBeenCalledTimes(1);
});

it("retires queued native selection when a rejected close replaces presentation", async () => {
  const f = fixture(true);
  await tick();
  f.projections.at(-1)!.items[0]!.onSelect();
  const previous = f.driver.value;
  f.driver.value = (props) => previous(props);
  await tick();
  expect(f.closed).toHaveBeenCalledTimes(1);
  expect(f.ran).not.toHaveBeenCalled();
});

it("dispatches an accepted close even if its closed presentation is replaced", async () => {
  const f = fixture();
  await tick();
  f.projections.at(-1)!.items[0]!.onSelect();
  const previous = f.driver.value;
  f.driver.value = (props) => previous(props);
  await tick();
  expect(f.closed).toHaveBeenCalledTimes(1);
  expect(f.ran).toHaveBeenCalledTimes(1);
});

it("releases native selection ownership when closing throws", async () => {
  const f = fixture();
  await tick();
  f.closed.mockImplementationOnce(() => {
    throw new Error("Close rejected");
  });
  const select = f.projections.at(-1)!.items[0]!.onSelect;
  expect(select).toThrow("Close rejected");
  select();
  await tick();
  expect(f.closed).toHaveBeenCalledTimes(2);
  expect(f.ran).toHaveBeenCalledTimes(1);
});

it.each([
  { props: {}, message: "requires the Surface control slot" },
  {
    props: { presentation: true },
    message: "requires a complete presentation renderer",
  },
])("rejects invalid controls: $message", ({ props, message }) => {
  const errors: unknown[] = [];
  const root = document.createElement("div");
  const app = createApp(ContextMenuChrome, {
    items: [],
    at: null,
    onClose: () => undefined,
    ...props,
  });
  app.config.errorHandler = (error) => errors.push(error);
  app.mount(root);
  stops.push(() => app.unmount());
  expect(errors).toHaveLength(1);
  expect(errors[0]).toBeInstanceOf(Error);
  expect(String(errors[0])).toContain(message);
});
