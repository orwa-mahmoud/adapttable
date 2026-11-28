import type { UseSavedViewsResult } from "@adapttable/vue";
import {
  managedOverlayPanel,
  resolveLabels,
  SavedViewsMenuChrome,
  type SavedViewsMenuSlots,
} from "@adapttable/vue/adapter";
import { afterEach, expect, it, vi } from "vitest";
import { computed, createApp, h, nextTick } from "vue";

import { headlessButton, headlessInput } from "../src/controls/basic";
import { headlessManagedPanel } from "../src/controls/managedPanel";
import { headlessSelect } from "../src/controls/select";

const stops: (() => void)[] = [];
afterEach(() => {
  stops
    .splice(0)
    .reverse()
    .forEach((stop) => stop());
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 15));
  await nextTick();
}
function element<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}

it("keeps a real nested Select portal inside managed ownership and closes layers one at a time", async () => {
  const scroll = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = () => undefined;
  stops.push(() => {
    HTMLElement.prototype.scrollIntoView = scroll;
  });
  const state: UseSavedViewsResult = {
    views: computed(() => []),
    defaultView: computed(() => undefined),
    save: vi.fn(),
    apply: vi.fn(),
    remove: vi.fn(),
    rename: vi.fn(),
    move: vi.fn(),
    setDefault: vi.fn(),
    reload: vi.fn(),
  };
  const slots: SavedViewsMenuSlots = {
    Trigger: ({ attrs, label }) => headlessButton(attrs, label),
    Button: ({ attrs, label }) => headlessButton(attrs, label),
    Input: headlessInput,
    Panel: managedOverlayPanel((control) =>
      headlessManagedPanel({
        ...control,
        content: [
          control.content,
          headlessSelect({
            attrs: { "aria-label": "Nested choice" },
            value: "a",
            options: [
              { value: "a", label: "Alpha" },
              { value: "b", label: "Beta" },
            ],
            onChange: vi.fn(),
          }),
        ],
      })
    ),
  };
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(SavedViewsMenuChrome, {
        savedViews: state,
        labels: resolveLabels(undefined),
        dir: "ltr",
        slots,
      }),
  });
  app.mount(host);
  stops.push(() => app.unmount());
  const trigger = element<HTMLButtonElement>(
    '[data-adapttable-part="views-button"]'
  );
  trigger.focus();
  trigger.click();
  await flush();
  const select = element<HTMLButtonElement>('[aria-label="Nested choice"]');
  select.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
  const listbox = element<HTMLElement>('[role="listbox"]');
  expect(host.contains(listbox)).toBe(false);
  expect(
    document.querySelector('[data-adapttable-part="views-panel"]')
  ).not.toBeNull();
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  listbox.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  expect(
    document.querySelector('[data-adapttable-part="views-panel"]')
  ).not.toBeNull();
  expect(document.activeElement).toBe(select);
  select.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
  expect(
    document.querySelector('[data-adapttable-part="views-panel"]')
  ).toBeNull();
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(trigger);
});

it("rejects a managed panel without its required accessible label", () => {
  expect(() =>
    headlessManagedPanel({
      attrs: {},
      content: null,
      anchor: null,
      open: true,
      isCurrent: () => true,
      onClose: vi.fn(),
    })
  ).toThrow("accessible string label");
});
