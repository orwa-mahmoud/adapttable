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
  type ContextMenuSlots,
} from "../src/actions/contextMenuChrome";
const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
async function tick() {
  await nextTick();
  await nextTick();
}
function fixture(
  reverseClose = false,
  rejectClose = false,
  freshDrivers = false
) {
  const ran = vi.fn();
  const at = shallowRef<{ x: number; y: number } | null>({ x: 1, y: 2 });
  const items = shallowRef([{ key: "first", label: "First", onSelect: ran }]);
  const shown = shallowRef(true);
  const callbacks: (() => void)[] = [];
  const closes: (() => void)[] = [];
  const closed = vi.fn(() => {
    if (rejectClose) return;
    if (reverseClose) {
      items.value = [];
      at.value = null;
    } else {
      at.value = null;
      items.value = [];
    }
  });
  const slots: ContextMenuSlots = {
    Surface: (props) => {
      closes.push(props.onClose);
      return h("div", { role: "menu" }, [props.children]);
    },
    Item: (props) => {
      callbacks.push(props.onSelect);
      return h("button", { onClick: props.onSelect }, props.item.label);
    },
    Separator: () => h("hr"),
  };
  const driver = shallowRef(slots.Surface);
  const Child = defineComponent(
    () => () =>
      h(ContextMenuChrome, {
        at: at.value,
        items: items.value,
        onClose: closed,
        slots: {
          ...slots,
          Surface: freshDrivers ? (props) => driver.value(props) : driver.value,
        },
      })
  );
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(() =>
    h(KeepAlive, null, { default: () => (shown.value ? h(Child) : h("span")) })
  );
  app.mount(root);
  let live = true;
  const stop = () => {
    if (live) {
      live = false;
      app.unmount();
      root.remove();
    }
  };
  stops.push(stop);
  return { driver, ran, at, items, shown, callbacks, closes, closed, stop };
}
it.each(["target", "items", "reactivated", "disposed"] as const)(
  "retires context-menu callbacks after %s",
  async (kind) => {
    const f = fixture();
    await tick();
    const select = f.callbacks.at(-1)!;
    const close = f.closes.at(-1)!;
    if (kind === "target") f.at.value = { x: 3, y: 4 };
    if (kind === "items")
      f.items.value = [{ key: "next", label: "Next", onSelect: f.ran }];
    if (kind === "reactivated") {
      f.shown.value = false;
      await tick();
      f.shown.value = true;
    }
    if (kind === "disposed") f.stop();
    await tick();
    select();
    close();
    await tick();
    expect(f.ran).not.toHaveBeenCalled();
    expect(f.closed).not.toHaveBeenCalled();
  }
);
it("runs a current enabled selection once after its accepted close", async () => {
  const f = fixture();
  await tick();
  f.callbacks.at(-1)!();
  await tick();
  expect(f.closed).toHaveBeenCalledTimes(1);
  expect(f.ran).toHaveBeenCalledTimes(1);
  expect(f.at.value).toBeNull();
});
it("cancels queued selection if a newer menu opens before dispatch", async () => {
  const f = fixture();
  await tick();
  f.callbacks.at(-1)!();
  f.at.value = { x: 9, y: 9 };
  f.items.value = [{ key: "next", label: "Next", onSelect: f.ran }];
  await tick();
  expect(f.closed).toHaveBeenCalledTimes(1);
  expect(f.ran).not.toHaveBeenCalled();
});

it("dispatches a repeated synchronous selection only once", async () => {
  const f = fixture();
  await tick();
  const select = f.callbacks.at(-1)!;
  select();
  select();
  await tick();
  expect(f.closed).toHaveBeenCalledTimes(1);
  expect(f.ran).toHaveBeenCalledTimes(1);
});
it("accepts close when the host clears items before the anchor", async () => {
  const f = fixture(true);
  await tick();
  f.callbacks.at(-1)!();
  await tick();
  expect(f.closed).toHaveBeenCalledTimes(1);
  expect(f.ran).toHaveBeenCalledTimes(1);
});
it("keeps one-shot selection valid in an unchanged rejected-close session", async () => {
  const f = fixture(false, true);
  await tick();
  const select = f.callbacks.at(-1)!;
  select();
  select();
  await tick();
  expect(f.closed).toHaveBeenCalledTimes(1);
  expect(f.ran).toHaveBeenCalledTimes(1);
  expect(f.at.value).not.toBeNull();
});

it.each([false, true])(
  "dispatches through an accepted closed projection with fresh driver functions, reverse close=%s",
  async (reverse) => {
    const f = fixture(reverse, false, true);
    await tick();
    f.callbacks.at(-1)!();
    await tick();
    expect(f.closed).toHaveBeenCalledTimes(1);
    expect(f.ran).toHaveBeenCalledTimes(1);
  }
);
it("retires queued selection when a rejected-close menu replaces its driver", async () => {
  const f = fixture(false, true);
  await tick();
  f.callbacks.at(-1)!();
  const previous = f.driver.value;
  f.driver.value = (props) => previous(props);
  await tick();
  expect(f.closed).toHaveBeenCalledTimes(1);
  expect(f.ran).not.toHaveBeenCalled();
});
it("releases pending selection ownership if the host close callback throws", async () => {
  const f = fixture();
  await tick();
  f.closed.mockImplementationOnce(() => {
    throw new Error("Host close failed");
  });
  const select = f.callbacks.at(-1)!;
  expect(select).toThrow("Host close failed");
  select();
  await tick();
  expect(f.closed).toHaveBeenCalledTimes(2);
  expect(f.ran).toHaveBeenCalledTimes(1);
});
