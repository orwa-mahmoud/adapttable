import { afterEach, expect, it, type MockInstance, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import {
  CommandPaletteChrome,
  type CommandPaletteChromeProps,
  type CommandPaletteSlots,
  managedCommandPaletteSurface,
  type ManagedCommandPaletteSurfaceProps,
} from "../src/actions/commandPaletteChrome";
import { toVueAttrs } from "../src/attrs";
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) {
    stop();
  }
  document.body.replaceChildren();
});
const controls: Omit<CommandPaletteSlots, "Surface"> = {
  Input: ({ inputProps: { value, onChange, ...attrs } }) =>
    h("input", {
      ...toVueAttrs(attrs),
      value,
      onInput: (event: Event) => {
        if (event.target instanceof HTMLInputElement)
          onChange(event.target.value);
      },
    }),
  Item: ({ command, itemProps }) =>
    h("div", toVueAttrs(itemProps), command.label),
  Empty: ({ message }) => h("p", message),
};
async function flush() {
  await nextTick();
  await nextTick();
}
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  stops.push(() => app.unmount());
  return { host, stop: () => app.unmount() };
}
it("keeps navigation in binding while a required managed surface alone owns dismissal", async () => {
  const close = vi.fn();
  const select = vi.fn();
  let surface: ManagedCommandPaletteSurfaceProps | undefined;
  const slots: CommandPaletteSlots = {
    ...controls,
    Surface: managedCommandPaletteSurface((props) => {
      surface = props;
      return h("section", { role: "dialog" }, [props.children]);
    }),
  };
  const { host } = mount(() =>
    h(CommandPaletteChrome, {
      open: true,
      onClose: close,
      commands: [
        { key: "a", label: "Alpha", onSelect: select },
        { key: "b", label: "Beta", disabled: true, onSelect: select },
      ],
      slots,
    })
  );
  await flush();
  const input = host.querySelector("input")!;
  input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
  expect(
    document.getElementById(input.getAttribute("aria-activedescendant")!)
      ?.textContent
  ).toBe("Beta");
  input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    })
  );
  input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
  await flush();
  expect(select).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  surface?.onClose();
  surface?.onClose();
  expect(close).toHaveBeenCalledTimes(2);
  expect(host.querySelector("input")).toBe(input);
});
it("guards delayed callbacks across reopen, driver replacement and disposal", async () => {
  const close = vi.fn();
  const snapshots: ManagedCommandPaletteSurfaceProps[] = [];
  const make = () =>
    managedCommandPaletteSurface((props) => {
      snapshots.push(props);
      return h("section", { role: "dialog" }, [props.children]);
    });
  const driver = shallowRef(make());
  const open = shallowRef(true);
  const commands: CommandPaletteChromeProps["commands"] = [];
  const { stop } = mount(() =>
    h(CommandPaletteChrome, {
      open: open.value,
      onClose: close,
      commands,
      slots: { ...controls, Surface: driver.value },
    })
  );
  await flush();
  const first = snapshots.at(-1)!;
  open.value = false;
  await flush();
  expect(first.isCurrent()).toBe(true);
  first.onClose();
  expect(close).not.toHaveBeenCalled();
  open.value = true;
  await flush();
  first.onClose();
  expect(first.isCurrent()).toBe(false);
  expect(close).not.toHaveBeenCalled();
  const second = snapshots.at(-1)!;
  driver.value = make();
  await flush();
  second.onClose();
  expect(second.isCurrent()).toBe(false);
  expect(close).not.toHaveBeenCalled();
  const last = snapshots.at(-1)!;
  stop();
  stops.pop();
  last.onClose();
  expect(last.isCurrent()).toBe(false);
  expect(close).not.toHaveBeenCalled();
});
it("preserves default input focus, generic outside dismissal and Escape", async () => {
  const close = vi.fn();
  const slots: CommandPaletteSlots = {
    ...controls,
    Surface: ({ children }) => h("section", { role: "dialog" }, [children]),
  };
  const { host } = mount(() =>
    h(CommandPaletteChrome, { open: true, onClose: close, commands: [], slots })
  );
  await flush();
  const input = host.querySelector("input")!;
  expect(document.activeElement).toBe(input);
  input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  expect(close).toHaveBeenCalledTimes(1);
  document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
  expect(close).toHaveBeenCalledTimes(2);
});

it("rejects a retained action when the command collection was replaced", async () => {
  const oldAction = vi.fn();
  const close = vi.fn();
  const commands = shallowRef([
    { key: "old", label: "Old", onSelect: oldAction },
  ]);
  let retained: (() => void) | undefined;
  const slots: CommandPaletteSlots = {
    ...controls,
    Item: (props) => {
      if (props.command.key === "old") {
        retained = props.itemProps.onClick;
      }
      return controls.Item(props);
    },
    Surface: managedCommandPaletteSurface(({ children }) =>
      h("section", { role: "dialog" }, [children])
    ),
  };
  mount(() =>
    h(CommandPaletteChrome, {
      open: true,
      commands: commands.value,
      onClose: close,
      slots,
    })
  );
  await flush();
  commands.value = [{ key: "new", label: "New", onSelect: vi.fn() }];
  await flush();
  retained?.();
  await flush();
  expect(oldAction).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
});
it("rejects a queued action when close replaces the command collection", async () => {
  const oldAction = vi.fn();
  const commands = shallowRef([
    { key: "old", label: "Old", onSelect: oldAction },
  ]);
  const close = () => {
    commands.value = [{ key: "new", label: "New", onSelect: vi.fn() }];
  };
  const slots: CommandPaletteSlots = {
    ...controls,
    Surface: managedCommandPaletteSurface(({ children }) =>
      h("section", { role: "dialog" }, [children])
    ),
  };
  const { host } = mount(() =>
    h(CommandPaletteChrome, {
      open: true,
      commands: commands.value,
      onClose: close,
      slots,
    })
  );
  await flush();
  host.querySelector<HTMLElement>('[role="option"]')?.click();
  await flush();
  expect(oldAction).not.toHaveBeenCalled();
});
it("retires generic focus restoration and callbacks when a managed surface takes over", async () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  const focus = vi.spyOn(opener, "focus");
  const open = shallowRef(true);
  const driver = shallowRef<CommandPaletteSlots["Surface"]>(({ children }) =>
    h("section", { role: "dialog" }, [children])
  );
  const inputs: Parameters<CommandPaletteSlots["Input"]>[0]["inputProps"][] =
    [];
  const slots = () => ({
    ...controls,
    Surface: driver.value,
    Input: (props: Parameters<CommandPaletteSlots["Input"]>[0]) => {
      inputs.push(props.inputProps);
      return controls.Input(props);
    },
  });
  const { host } = mount(() =>
    h(CommandPaletteChrome, {
      open: open.value,
      commands: [],
      onClose: () => {
        open.value = false;
      },
      slots: slots(),
    })
  );
  await flush();
  const prior = inputs.at(-1)!;
  expect(document.activeElement).toBe(host.querySelector("input"));
  driver.value = managedCommandPaletteSurface(({ children }) =>
    h("article", { role: "dialog" }, [children])
  );
  await flush();
  prior.onChange("stale query");
  await flush();
  expect(host.querySelector("input")?.value).toBe("");
  open.value = false;
  await flush();
  expect(focus).not.toHaveBeenCalled();
});

it("invalidates queued generic focus when its native ref immediately switches the surface", async () => {
  const commands: CommandPaletteChromeProps["commands"] = [];
  const managed = managedCommandPaletteSurface(({ children }) =>
    h("article", { role: "dialog" }, [children])
  );
  const generic: CommandPaletteSlots["Surface"] = ({ children }) =>
    h("section", { role: "dialog" }, [children]);
  const driver = shallowRef(generic);
  let first: HTMLInputElement | null = null;
  let focus: MockInstance<(options?: FocusOptions) => void> | undefined;
  const targets: (HTMLInputElement | null)[] = [];
  const slots = (): CommandPaletteSlots => ({
    ...controls,
    Surface: driver.value,
    Input: ({ inputProps }) =>
      controls.Input({
        inputProps: {
          ...inputProps,
          ref: (element) => {
            targets.push(element);
            inputProps.ref(element);
            if (element && !first) {
              first = element;
              focus = vi.spyOn(element, "focus");
              driver.value = managed;
            }
          },
        },
      }),
  });
  const { host } = mount(() =>
    h(CommandPaletteChrome, {
      open: true,
      commands,
      onClose: vi.fn(),
      slots: slots(),
    })
  );
  await flush();
  expect(first).not.toBeNull();
  expect(focus).not.toHaveBeenCalled();
  expect(targets).toContain(null);
  expect(targets.at(-1)).toBe(host.querySelector("input"));
  expect(targets.at(-1)).not.toBe(first);
});
