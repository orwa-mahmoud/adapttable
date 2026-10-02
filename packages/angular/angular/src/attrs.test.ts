import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { AdaptAttrs, type Attrs } from "./attrs";

@Component({
  imports: [AdaptAttrs],
  template: `<button [adaptAttrs]="attrs()"></button>`,
})
class Host {
  readonly attrs = signal<Attrs>({});
}

async function mount(attrs: Attrs) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.attrs.set(attrs);
  await fixture.whenStable();
  const button = (fixture.nativeElement as HTMLElement).querySelector(
    "button"
  )!;
  const update = async (next: Attrs) => {
    fixture.componentInstance.attrs.set(next);
    await fixture.whenStable();
  };
  return { button, update, fixture };
}

describe("AdaptAttrs", () => {
  it("writes attributes, ARIA booleans as tokens and plain booleans as presence", async () => {
    const { button } = await mount({
      role: "row",
      "data-index": 2,
      "aria-selected": false,
      disabled: true,
      hidden: false,
      title: undefined,
    });
    expect(button.getAttribute("role")).toBe("row");
    expect(button.getAttribute("data-index")).toBe("2");
    expect(button.getAttribute("aria-selected")).toBe("false");
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.hasAttribute("hidden")).toBe(false);
    expect(button.hasAttribute("title")).toBe(false);
  });

  it("writes an enumerated boolean as true or false so the element can drag", async () => {
    const { button, update } = await mount({ draggable: true });
    expect(button.getAttribute("draggable")).toBe("true");
    expect(button.draggable).toBe(true);
    await update({ draggable: false });
    expect(button.getAttribute("draggable")).toBe("false");
    expect(button.draggable).toBe(false);
  });

  it("removes attributes and styles that leave the record", async () => {
    const { button, update } = await mount({
      "aria-label": "Sort",
      style: { minWidth: "80px", textAlign: "end", width: undefined },
    });
    expect(button.style.minWidth).toBe("80px");
    expect(button.style.textAlign).toBe("end");
    await update({ style: { minWidth: "90px" } });
    expect(button.hasAttribute("aria-label")).toBe(false);
    expect(button.style.minWidth).toBe("90px");
    expect(button.style.textAlign).toBe("");
    await update({ style: null });
    expect(button.style.minWidth).toBe("");
  });

  it("writes a numeric length in pixels, and a unitless property as it is", async () => {
    const { button } = await mount({
      style: {
        top: 48,
        insetInlineStart: 150,
        width: 0,
        zIndex: 3,
        opacity: 0.5,
        flexGrow: 2,
      },
    });
    expect(button.style.top).toBe("48px");
    expect(button.style.getPropertyValue("inset-inline-start")).toBe("150px");
    expect(button.style.width).toBe("0px");
    expect(button.style.zIndex).toBe("3");
    expect(button.style.opacity).toBe("0.5");
    expect(button.style.flexGrow).toBe("2");
  });

  it("sets value as the property", async () => {
    const { button, update } = await mount({ value: "one" });
    expect(button.value).toBe("one");
    await update({ value: null });
    expect(button.value).toBe("");
  });

  it("calls the newest click handler and drops a removed one", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { button, update } = await mount({ onClick: first });
    button.click();
    expect(first).toHaveBeenCalledTimes(1);

    await update({ onClick: second });
    button.click();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    await update({ onClick: undefined });
    button.click();
    await update({});
    button.click();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("maps onChange to every input event", async () => {
    const onChange = vi.fn();
    const { button } = await mount({ onChange });
    button.dispatchEvent(new Event("input"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("releases listeners and its ref when a retained node is detached on destroy", async () => {
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    const ref = vi.fn();
    const { button, fixture } = await mount({ onClick, onKeyDown, ref });
    document.body.append(fixture.nativeElement as HTMLElement);
    button.click();
    button.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(ref).toHaveBeenCalledExactlyOnceWith(button);

    fixture.destroy();
    (fixture.nativeElement as HTMLElement).remove();
    expect(button.isConnected).toBe(false);
    expect(ref.mock.calls).toEqual([[button], [null]]);
    button.click();
    button.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });
});
