import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  PLATFORM_ID,
  signal,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { AdaptAttrs, type Attrs } from "./attrs";

@Component({
  imports: [AdaptAttrs],
  template: `<button
    [adaptAttrs]="attrs()"
    [adaptAttrsTarget]="target()"
  ></button>`,
})
class Host {
  readonly attrs = signal<Attrs>({});
  readonly target = signal<HTMLElement | null | undefined>(undefined);
}

@Component({
  selector: "generated-table",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (replacement() || internalReplacement()) {
      <table #table data-version="replacement"></table>
    } @else {
      <table #table data-version="initial"></table>
    }
  `,
})
class GeneratedTable {
  readonly table = viewChild<ElementRef<HTMLTableElement>>("table");
  readonly replacement = input(false);
  readonly internalReplacement = signal(false);
}

@Component({
  imports: [AdaptAttrs, GeneratedTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<generated-table
    #surface
    [adaptAttrs]="attrs()"
    [adaptAttrsTarget]="surface.table()?.nativeElement ?? null"
  />`,
})
class InnerTableHost {
  readonly attrs = signal<Attrs>({});
}

@Component({
  imports: [AdaptAttrs, GeneratedTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<generated-table
    #surface
    [replacement]="replacement()"
    [adaptAttrs]="attrs()"
    [adaptAttrsTarget]="target"
  />`,
})
class InnerGetterHost {
  readonly attrs = signal<Attrs>({});
  readonly replacement = signal(false);
  readonly surface = viewChild(GeneratedTable);
  readonly element = viewChild<
    ElementRef<HTMLElement>,
    ElementRef<HTMLElement>
  >("surface", {
    read: ElementRef,
  });
  readonly target = () =>
    this.element()?.nativeElement.querySelector("table") ?? null;
}

async function mount(attrs: Attrs, target?: HTMLElement | null) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.attrs.set(attrs);
  fixture.componentInstance.target.set(target);
  await fixture.whenStable();
  const button = (fixture.nativeElement as HTMLElement).querySelector(
    "button"
  )!;
  const update = async (next: Attrs) => {
    fixture.componentInstance.attrs.set(next);
    await fixture.whenStable();
  };
  const retarget = async (next: HTMLElement | null | undefined) => {
    fixture.componentInstance.target.set(next);
    await fixture.whenStable();
  };
  return { button, update, retarget, fixture };
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

  it("applies the whole record to an inner table supplied by its component's view", async () => {
    const onClick = vi.fn();
    const ref = vi.fn((element: HTMLElement | null) => {
      if (element) expect(element.getAttribute("role")).toBe("grid");
    });
    const fixture = TestBed.createComponent(InnerTableHost);
    fixture.componentInstance.attrs.set({
      ref,
      role: "grid",
      "aria-rowcount": 12,
      "data-adapttable-part": "table",
      tabIndex: 0,
      style: { width: 320 },
      onClick,
    });
    await fixture.whenStable();
    const host = (fixture.nativeElement as HTMLElement).querySelector(
      "generated-table"
    )!;
    const table = host.querySelector("table")!;
    expect(host.hasAttribute("role")).toBe(false);
    expect(host.hasAttribute("aria-rowcount")).toBe(false);
    expect(host.hasAttribute("data-adapttable-part")).toBe(false);
    expect(table.getAttribute("role")).toBe("grid");
    expect(table.getAttribute("aria-rowcount")).toBe("12");
    expect(table.getAttribute("data-adapttable-part")).toBe("table");
    expect(table.tabIndex).toBe(0);
    expect(table.style.width).toBe("320px");
    expect(ref).toHaveBeenCalledExactlyOnceWith(table);
    host.dispatchEvent(new Event("click"));
    expect(onClick).not.toHaveBeenCalled();
    table.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each(["browser", "server"])(
    "resolves a stable getter during view checks on the %s platform",
    async (platform) => {
      TestBed.overrideProvider(PLATFORM_ID, { useValue: platform });
      const ref = vi.fn();
      const fixture = TestBed.createComponent(InnerGetterHost);
      fixture.componentInstance.attrs.set({
        role: "grid",
        "aria-rowcount": 4,
        style: { width: 240 },
        ref,
      });
      // Detect this view directly: after-render callbacks run only during the
      // application tick, so these assertions exercise the server-safe hook.
      fixture.changeDetectorRef.detectChanges();
      const host = (fixture.nativeElement as HTMLElement).querySelector(
        "generated-table"
      )!;
      const first = host.querySelector("table")!;
      expect(first.getAttribute("role")).toBe("grid");
      expect(first.getAttribute("aria-rowcount")).toBe("4");
      expect(first.style.width).toBe("240px");
      expect(host.hasAttribute("role")).toBe(false);
      expect(ref).toHaveBeenCalledExactlyOnceWith(first);

      const write = vi.spyOn(first, "setAttribute");
      fixture.changeDetectorRef.detectChanges();
      expect(write).not.toHaveBeenCalled();
      expect(ref).toHaveBeenCalledTimes(1);
      fixture.componentInstance.replacement.set(true);
      fixture.changeDetectorRef.detectChanges();
      const replacement = host.querySelector("table")!;
      expect(replacement).not.toBe(first);
      expect(replacement.dataset.version).toBe("replacement");
      expect(replacement.getAttribute("role")).toBe("grid");
      expect(replacement.getAttribute("aria-rowcount")).toBe("4");
      expect(replacement.style.width).toBe("240px");
      expect(first.hasAttribute("role")).toBe(false);
      expect(first.style.width).toBe("");
      expect(ref.mock.calls).toEqual([[first], [null], [replacement]]);
      await fixture.whenStable();
      expect(ref.mock.calls).toEqual([[first], [null], [replacement]]);
    }
  );

  it("refreshes a getter target after a child-only OnPush view replacement", async () => {
    const ref = vi.fn();
    const onClick = vi.fn();
    const fixture = TestBed.createComponent(InnerGetterHost);
    fixture.componentInstance.attrs.set({ role: "grid", onClick, ref });
    await fixture.whenStable();
    const host = (fixture.nativeElement as HTMLElement).querySelector(
      "generated-table"
    )!;
    const first = host.querySelector("table")!;
    fixture.componentInstance.surface()!.internalReplacement.set(true);
    await fixture.whenStable();
    const replacement = host.querySelector("table")!;
    expect(replacement).not.toBe(first);
    expect(replacement.getAttribute("role")).toBe("grid");
    expect(first.hasAttribute("role")).toBe(false);
    expect(ref.mock.calls).toEqual([[first], [null], [replacement]]);
    first.click();
    expect(onClick).not.toHaveBeenCalled();
    replacement.click();
    expect(onClick).toHaveBeenCalledTimes(1);

    fixture.destroy();
    expect(ref.mock.calls).toEqual([[first], [null], [replacement], [null]]);
    expect(replacement.hasAttribute("role")).toBe(false);
    replacement.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("moves attributes, styles and controlled properties to a replacement target", async () => {
    const first = document.createElement("input");
    const second = document.createElement("input");
    const attrs = {
      "aria-label": "Editor",
      tabIndex: 0,
      style: { width: 120, opacity: 0.5 },
      value: "before",
      checked: true,
      indeterminate: true,
    };
    const { button, fixture, retarget } = await mount(attrs, first);
    expect(first.getAttribute("aria-label")).toBe("Editor");
    expect(first.style.width).toBe("120px");
    expect(first.value).toBe("before");
    expect(first.checked).toBe(true);
    expect(first.indeterminate).toBe(true);
    expect(button.hasAttribute("aria-label")).toBe(false);

    fixture.componentInstance.attrs.set({ ...attrs, value: "current" });
    await retarget(second);
    expect(first.hasAttribute("aria-label")).toBe(false);
    expect(first.hasAttribute("tabindex")).toBe(false);
    expect(first.style.width).toBe("");
    expect(first.style.opacity).toBe("");
    expect(first.value).toBe("");
    expect(first.checked).toBe(false);
    expect(first.indeterminate).toBe(false);
    expect(second.getAttribute("aria-label")).toBe("Editor");
    expect(second.tabIndex).toBe(0);
    expect(second.style.width).toBe("120px");
    expect(second.style.opacity).toBe("0.5");
    expect(second.value).toBe("current");
    expect(second.checked).toBe(true);
    expect(second.indeterminate).toBe(true);
  });

  it("resets controlled properties that leave the record on the same target", async () => {
    const input = document.createElement("input");
    const { update } = await mount(
      { value: "edit", checked: true, indeterminate: true },
      input
    );
    await update({});
    expect(input.value).toBe("");
    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(false);
  });

  it("migrates listeners and the ref without leaving callbacks on the old target", async () => {
    const first = document.createElement("input");
    const second = document.createElement("input");
    const previous = vi.fn();
    const current = vi.fn();
    const ref = vi.fn();
    const { fixture, update, retarget } = await mount(
      { onChange: previous, ref },
      first
    );
    first.dispatchEvent(new Event("input"));
    expect(previous).toHaveBeenCalledTimes(1);

    fixture.componentInstance.attrs.set({ onChange: current, ref });
    await retarget(second);
    expect(ref.mock.calls).toEqual([[first], [null], [second]]);
    first.dispatchEvent(new Event("input"));
    second.dispatchEvent(new Event("input"));
    expect(previous).toHaveBeenCalledTimes(1);
    expect(current).toHaveBeenCalledTimes(1);

    await update({ onChange: current, ref, "aria-label": "Current" });
    second.dispatchEvent(new Event("input"));
    expect(current).toHaveBeenCalledTimes(2);
    expect(ref.mock.calls).toEqual([[first], [null], [second]]);
    const nextRef = vi.fn();
    await update({ onChange: current, ref: nextRef });
    expect(ref.mock.calls).toEqual([[first], [null], [second], [null]]);
    expect(nextRef).toHaveBeenCalledExactlyOnceWith(second);
    await update({ onChange: current });
    expect(nextRef.mock.calls).toEqual([[second], [null]]);
  });

  it("defers a null target and applies only the newest record when it becomes available", async () => {
    const firstRef = vi.fn();
    const ref = vi.fn();
    const onClick = vi.fn();
    const { button, update, retarget, fixture } = await mount(
      { "aria-label": "Pending", ref: firstRef, onClick },
      null
    );
    expect(button.hasAttribute("aria-label")).toBe(false);
    button.click();
    expect(onClick).not.toHaveBeenCalled();
    expect(firstRef).not.toHaveBeenCalled();
    await update({ "aria-label": "Ready", ref, onClick });
    expect(ref).not.toHaveBeenCalled();

    const target = document.createElement("button");
    await retarget(target);
    expect(target.getAttribute("aria-label")).toBe("Ready");
    expect(ref).toHaveBeenCalledExactlyOnceWith(target);
    expect(firstRef).not.toHaveBeenCalled();
    target.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    await retarget(null);
    expect(target.hasAttribute("aria-label")).toBe(false);
    expect(ref.mock.calls).toEqual([[target], [null]]);
    target.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(ref.mock.calls).toEqual([[target], [null]]);
  });

  it("returns to the host for an undefined target and releases each previous element", async () => {
    const ref = vi.fn();
    const onClick = vi.fn();
    const { button, retarget } = await mount({ title: "Target", onClick, ref });
    const inner = document.createElement("button");
    await retarget(inner);
    expect(button.hasAttribute("title")).toBe(false);
    expect(inner.title).toBe("Target");
    button.click();
    expect(onClick).not.toHaveBeenCalled();
    await retarget(undefined);
    expect(button.title).toBe("Target");
    expect(inner.hasAttribute("title")).toBe(false);
    inner.click();
    expect(onClick).not.toHaveBeenCalled();
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(ref.mock.calls).toEqual([
      [button],
      [null],
      [inner],
      [null],
      [button],
    ]);
  });

  it("releases retained custom targets on destroy after a live replacement", async () => {
    const first = document.createElement("input");
    const current = document.createElement("input");
    const ref = vi.fn();
    const onChange = vi.fn();
    const onKeyDown = vi.fn();
    const { fixture, retarget } = await mount(
      {
        ref,
        onChange,
        onKeyDown,
        "aria-label": "Edit",
        style: { width: 80 },
        value: "draft",
        checked: true,
        indeterminate: true,
      },
      first
    );
    await retarget(current);
    current.dispatchEvent(new Event("input"));
    current.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(ref.mock.calls).toEqual([[first], [null], [current], [null]]);
    for (const target of [first, current]) {
      expect(target.hasAttribute("aria-label")).toBe(false);
      expect(target.style.width).toBe("");
      expect(target.value).toBe("");
      expect(target.checked).toBe(false);
      expect(target.indeterminate).toBe(false);
      target.dispatchEvent(new Event("input"));
      target.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    }
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
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
