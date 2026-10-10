import { mount } from "@vue/test-utils";
import { Quasar } from "quasar";
import { expect, it } from "vitest";
import { nextTick } from "vue";

import { ColumnMenuFixture } from "./columnMenuFixture";

const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 45));
  await nextTick();
};

it("returns an ordinary native column action to its still-visible More trigger", async () => {
  const wrapper = mount(ColumnMenuFixture, {
    attachTo: document.body,
    global: { plugins: [Quasar] },
  });
  const part = (name: string) => `[data-adapttable-part="${name}"]`;
  const button = (name: string): HTMLButtonElement => {
    const target = document.body.querySelector<HTMLButtonElement>(part(name));
    if (!target) throw new Error(`Missing ${name}`);
    return target;
  };
  const click = async (name: string) => {
    button(name).focus();
    button(name).click();
    await settle();
  };
  try {
    await click("column-menu-button");
    await click("column-menu-more");
    const more = button("column-menu-more");
    const action = button("column-menu-action");
    expect(action.textContent).toContain("Pin to start");
    await click("column-menu-action");
    expect(document.body.querySelector(part("column-menu-submenu"))).toBeNull();
    expect(more.isConnected).toBe(true);
    expect(document.activeElement).toBe(more);
  } finally {
    wrapper.unmount();
    await settle();
  }
});
