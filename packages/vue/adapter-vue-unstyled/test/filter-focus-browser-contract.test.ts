import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { h, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { filters } from "../src/filters";
import { NativeFilterSurface } from "../src/filters/NativeFilterSurface";
import { find, mountNative, part, tick, write } from "./filter-editing-helpers";

const originalFocus = HTMLElement.prototype.focus;
const inertDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "inert"
);
const methods = ["showModal", "close"] as const;
const descriptors = methods.map((name) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name)
);
const prior = new WeakMap<HTMLDialogElement, Element | null>();
const dispose: (() => void)[] = [];

beforeEach(() => {
  // Match the browser's boolean reflection when jsdom lacks this property.
  if (!inertDescriptor)
    Object.defineProperty(HTMLElement.prototype, "inert", {
      configurable: true,
      get(this: HTMLElement) {
        return this.hasAttribute("inert");
      },
      set(this: HTMLElement, value: boolean) {
        this.toggleAttribute("inert", value);
      },
    });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      prior.set(this, document.activeElement);
      this.open = true;
      // Native dialog focusing includes the foreground tabindex=-1 wrapper.
      (
        this.querySelector<HTMLElement>("[autofocus]") ??
        this.querySelector<HTMLElement>("[tabindex='-1']")
      )?.focus();
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false;
      const before = prior.get(this);
      if (before instanceof HTMLElement) before.focus();
    },
  });
  vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(function (
    this: HTMLElement
  ) {
    const modal = document.querySelector("dialog[open]");
    if (!this.matches(":disabled") && (!modal || modal.contains(this)))
      originalFocus.call(this);
  });
});
afterEach(() => {
  try {
    for (const stop of dispose.splice(0)) stop();
  } finally {
    methods.forEach((name, index) => {
      const descriptor = descriptors[index];
      if (descriptor)
        Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
    });
    if (inertDescriptor)
      Object.defineProperty(HTMLElement.prototype, "inert", inertDescriptor);
    else Reflect.deleteProperty(HTMLElement.prototype, "inert");
  }
});

function blurDisabledControl(element: HTMLElement): void {
  const disabled = element.getAttribute("disabled");
  if (element.ownerDocument.activeElement !== element || disabled === null) {
    element.blur();
    return;
  }
  // jsdom refuses blur after disabling; use its real blur/focusout events.
  element.removeAttribute("disabled");
  try {
    element.blur();
  } finally {
    element.setAttribute("disabled", disabled);
  }
}

function escape() {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", cancelable: true })
  );
}

function surface(modal: boolean) {
  const open = shallowRef(true);
  const disabled = shallowRef(false);
  const removed = shallowRef(false);
  const anchor = document.createElement("button");
  const other = document.createElement("button");
  document.body.append(anchor, other);
  anchor.focus();
  let accepted = true;
  let afterClose: () => void = () => undefined;
  const close = vi.fn(() => {
    if (accepted) open.value = false;
    afterClose();
  });
  const view = mountNative(() =>
    h(NativeFilterSurface, {
      open: open.value,
      modal,
      dir: "ltr",
      label: "Filters",
      anchor,
      onClose: close,
      children: h("div", [
        !removed.value &&
          h("button", { disabled: disabled.value, id: "owned-clear" }, "Clear"),
        h("input", { "aria-label": "Current filter" }),
      ]),
    })
  );
  dispose.push(() => {
    view.stop();
    anchor.remove();
    other.remove();
  });
  return {
    ...view,
    anchor,
    other,
    open,
    disabled,
    removed,
    close,
    reject: () => {
      accepted = false;
    },
    afterClose: (callback: () => void) => {
      afterClose = callback;
    },
  };
}

describe("native filter browser focus contract", () => {
  it("enters an enabled control when native showModal initially focuses the wrapper", async () => {
    const view = surface(true);
    await tick();
    expect(document.activeElement).toBe(find(document.body, "#owned-clear"));
    expect(view.close).not.toHaveBeenCalled();
  });

  it("skips disabled controls when selecting the initial control", async () => {
    const view = surface(true);
    view.disabled.value = true;
    await tick();
    expect(document.activeElement).toBe(
      find(document.body, 'input[aria-label="Current filter"]')
    );
  });

  it("restores focus after the real popover Done action is accepted", async () => {
    interface Row {
      id: string;
      name: string;
    }
    const view = mountNative(() =>
      h(DataTable<Row>, {
        data: [{ id: "1", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        features: [filters<Row>([{ key: "name", type: "text" }])],
      })
    );
    await tick();
    const trigger = find(view.host, part("filters-button"));
    trigger.focus();
    trigger.click();
    await tick();
    const done = find(document.body, part("filters-done"));
    done.focus();
    done.click();
    await tick();
    expect(document.body.querySelector(part("filters-popover"))).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("restores the drawer trigger after its real Clear control becomes disabled before Escape", async () => {
    interface Row {
      id: string;
      name: string;
    }
    const view = mountNative(() =>
      h(DataTable<Row>, {
        data: [{ id: "1", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        features: [
          filters<Row>([{ key: "name", type: "text" }], { mode: "drawer" }),
        ],
      })
    );
    await tick();
    const trigger = find(view.host, part("filters-button"));
    trigger.focus();
    trigger.click();
    await tick();
    await write(
      find<HTMLInputElement>(document.body, part("filter-input")),
      "Ada"
    );
    const clear = find<HTMLButtonElement>(document.body, part("filters-clear"));
    expect(clear.disabled).toBe(false);
    clear.focus();
    clear.click();
    await tick();
    expect(clear.disabled).toBe(true);
    // jsdom keeps disabled controls focused; Chromium blurs them to body.
    blurDisabledControl(clear);
    expect(document.activeElement).toBe(document.body);
    escape();
    await tick();
    expect(document.body.querySelector(part("filters-panel"))).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  for (const modal of [false, true]) {
    for (const loss of ["disabled", "removed"] as const) {
      it(`restores accepted ${modal ? "drawer" : "popover"} close after an owned control is ${loss}`, async () => {
        const view = surface(modal);
        await tick();
        const owned = find(document.body, "#owned-clear");
        owned.focus();
        view[loss].value = true;
        await tick();
        blurDisabledControl(owned);
        expect(document.activeElement).toBe(document.body);
        escape();
        await tick();
        expect(view.close).toHaveBeenCalledExactlyOnceWith("escape");
        expect(document.activeElement).toBe(view.anchor);
      });
    }
    it(`lets distinct host focus win after lost ${modal ? "drawer" : "popover"} control focus`, async () => {
      const view = surface(modal);
      await tick();
      const owned = find(document.body, "#owned-clear");
      owned.focus();
      view.disabled.value = true;
      await tick();
      blurDisabledControl(owned);
      view.afterClose(() => {
        void nextTick(() => view.other.focus());
      });
      escape();
      await tick();
      expect(document.activeElement).toBe(view.other);
    });
  }

  it("does not revive earlier ownership after focus moves to a distinct host target", async () => {
    const view = surface(false);
    await tick();
    const owned = find(document.body, "#owned-clear");
    owned.focus();
    view.disabled.value = true;
    await tick();
    blurDisabledControl(owned);
    view.other.focus();
    view.other.blur();
    expect(document.activeElement).toBe(document.body);
    escape();
    await tick();
    expect(document.activeElement).toBe(document.body);
  });

  it("keeps a rejected close open after the owned control loses focus", async () => {
    const view = surface(true);
    await tick();
    const owned = find(document.body, "#owned-clear");
    owned.focus();
    view.disabled.value = true;
    await tick();
    blurDisabledControl(owned);
    view.reject();
    escape();
    await tick();
    expect(document.querySelector<HTMLDialogElement>("dialog")?.open).toBe(
      true
    );
    expect(document.activeElement).not.toBe(view.anchor);
  });
});
