import type { ElementRef } from "@adapttable/vue";
import { describe, expect, it, vi } from "vitest";

import { nuxtSelection } from "../src/controls/selection";
import { nuxtFilterSlots } from "../src/filters/nuxtFilterSlots";

describe("Nuxt checkbox unsupported native-ref boundary", () => {
  it("rejects a selection ref before constructing a component or invoking its owner", () => {
    const owner = vi.fn<ElementRef<HTMLElement>>();
    expect(() =>
      nuxtSelection({
        attrs: { ref: owner },
        checked: false,
        indeterminate: false,
        onToggle: vi.fn(),
      })
    ).toThrow("A checkbox attrs.ref is unsupported");
    expect(owner).not.toHaveBeenCalled();
  });
  it("rejects a filter checkbox ref before it can receive a component instance", () => {
    const owner = vi.fn<ElementRef<HTMLElement>>();
    expect(() =>
      nuxtFilterSlots(() => ({})).Checkbox({
        label: "Enabled",
        checked: false,
        attrs: { ref: owner },
        onChange: vi.fn(),
      })
    ).toThrow("A checkbox attrs.ref is unsupported");
    expect(owner).not.toHaveBeenCalled();
  });
  it("strips empty refs while retaining normal selection and filter controls", () => {
    const selection = nuxtSelection({
      attrs: { ref: null, "aria-label": "Select row" },
      checked: true,
      indeterminate: false,
      onToggle: vi.fn(),
    });
    expect(selection.props?.ref).toBeUndefined();
    expect(selection.props?.["aria-label"]).toBe("Select row");
    expect(selection.props?.modelValue).toBe(true);
    expect(
      nuxtFilterSlots(() => ({})).Checkbox({
        label: "Enabled",
        checked: false,
        attrs: { ref: undefined },
        onChange: vi.fn(),
      })
    ).toBeTruthy();
  });
});
