/**
 * The palette chrome: the dialog, the list keys, and the outside press.
 */
import type { Command } from "@adapttable/core";
import { NgTemplateOutlet } from "@angular/common";
import {
  afterNextRender,
  Component,
  type ElementRef,
  input,
  PLATFORM_ID,
  signal,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { describe, expect, it, vi } from "vitest";

import {
  AdaptCommandPaletteChrome,
  type CommandPaletteSlots,
  type CommandPaletteSurfaceProps,
} from "./commandPaletteChrome";

@Component({
  selector: "palette-surface",
  imports: [NgTemplateOutlet],
  template: `
    <section
      role="dialog"
      aria-modal="true"
      data-kit-surface
      data-adapttable-part="command-palette"
      [attr.aria-label]="props().label"
      [class]="props().className"
      (surfaceDismiss)="props().onClose()"
    >
      <ng-container [ngTemplateOutlet]="props().children ?? null" />
    </section>
  `,
})
class PaletteSurface {
  readonly props = input.required<CommandPaletteSurfaceProps>();
}

@Component({
  selector: "palette-input",
  template: `
    <input
      #box
      data-adapttable-part="command-input"
      [value]="props().inputProps.value"
      [attr.aria-label]="props().inputProps['aria-label']"
      (input)="changed($event)"
      (keydown)="props().inputProps.onKeyDown($event)"
    />
  `,
})
class PaletteInput {
  readonly props = input.required<{
    readonly inputProps: {
      readonly value: string;
      readonly onChange: (next: string) => void;
      readonly onKeyDown: (event: KeyboardEvent) => void;
      readonly ref: (element: HTMLInputElement | null) => void;
      readonly "aria-label": string;
    };
  }>();
  private readonly box =
    viewChild.required<ElementRef<HTMLInputElement>>("box");

  constructor() {
    afterNextRender(() => {
      this.props().inputProps.ref(null);
      this.props().inputProps.ref(this.box().nativeElement);
    });
  }

  protected changed(event: Event): void {
    this.props().inputProps.onChange((event.target as HTMLInputElement).value);
  }
}

@Component({
  selector: "palette-item",
  template: `
    <button
      type="button"
      data-adapttable-part="command-item"
      [attr.aria-selected]="props().itemProps['aria-selected']"
      [disabled]="props().command.disabled === true"
      (click)="props().itemProps.onClick()"
      (mouseenter)="props().itemProps.onMouseEnter()"
    >
      {{ props().command.label }}
    </button>
  `,
})
class PaletteItem {
  readonly props = input.required<{
    readonly command: Command;
    readonly itemProps: {
      readonly "aria-selected": boolean;
      readonly onClick: () => void;
      readonly onMouseEnter: () => void;
    };
  }>();
}

@Component({
  selector: "palette-empty",
  template: `<p data-adapttable-part="command-empty">{{ props().message }}</p>`,
})
class PaletteEmpty {
  readonly props = input.required<{ readonly message: string }>();
}

const SLOTS: CommandPaletteSlots = {
  Surface: PaletteSurface,
  Input: PaletteInput,
  Item: PaletteItem,
  Empty: PaletteEmpty,
};

@Component({
  imports: [AdaptCommandPaletteChrome],
  template: `
    <adapt-command-palette-chrome
      [commands]="commands()"
      [open]="open()"
      [onClose]="close"
      [labels]="labels()"
      [className]="className()"
      [slots]="slots"
    />
  `,
})
class ChromeHost {
  readonly greeted = vi.fn();
  readonly skipped = vi.fn();
  readonly commands = signal<readonly Command[]>([
    {
      key: "nope",
      label: "Nope",
      disabled: true,
      onSelect: () => this.skipped(),
    },
    { key: "greet", label: "Greet", onSelect: () => this.greeted() },
  ]);
  readonly open = signal(false);
  readonly labels = signal<
    | { commandPalette?: string; commandSearch?: string; commandEmpty?: string }
    | undefined
  >(undefined);
  readonly className = signal<string | undefined>(undefined);
  readonly closed = vi.fn();
  readonly slots = SLOTS;
  readonly close = (): void => {
    this.closed();
    this.open.set(false);
  };
}

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

async function mount(
  open = true
): Promise<ReturnType<typeof TestBed.createComponent<ChromeHost>>> {
  const fixture = TestBed.createComponent(ChromeHost);
  document.body.append(fixture.nativeElement);
  if (open) fixture.componentInstance.open.set(true);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe("AdaptCommandPaletteChrome", () => {
  it("lets the kit own the only dialog surface and route its dismiss channel", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const fixture = await mount();
    const host = fixture.componentInstance;
    host.labels.set({ commandPalette: "Table actions" });
    host.className.set("host-surface");
    fixture.detectChanges();
    const surface = document.querySelector<HTMLElement>("[data-kit-surface]");
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(surface?.getAttribute("aria-label")).toBe("Table actions");
    expect(surface?.className).toBe("host-surface");
    expect(
      surface?.querySelector('[data-adapttable-part="command-input"]')
    ).toBe(document.activeElement);
    surface?.dispatchEvent(new Event("surfaceDismiss"));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.closed).toHaveBeenCalledOnce();
    expect(part("command-palette")).toBeNull();
    expect(document.activeElement).toBe(opener);
    opener.remove();
    fixture.destroy();
  });

  it("draws nothing while it is closed", async () => {
    const fixture = await mount(false);
    expect(part("command-palette")).toBeNull();
    fixture.destroy();
  });

  it("runs the highlighted command from a click, a key, and the mouse", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const fixture = await mount();
    const host = fixture.componentInstance;
    const surface = part("command-palette");
    expect(surface?.getAttribute("aria-label")).toBe("Command palette");
    expect(part("command-list")).not.toBeNull();
    expect(part("command-input")?.getAttribute("aria-label")).toBe(
      "Search commands"
    );

    const input = part("command-input") as HTMLInputElement;
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true })
    );
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    expect(host.skipped).not.toHaveBeenCalled();
    expect(host.open()).toBe(true);

    const items = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[data-adapttable-part="command-item"]'
      ),
    ];
    items[1]?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    fixture.detectChanges();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    fixture.detectChanges();
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        shiftKey: true,
      })
    );
    items[1]?.focus();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true })
    );
    items[1]?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.greeted).toHaveBeenCalledOnce();
    expect(part("command-palette")).toBeNull();
    expect(document.activeElement).toBe(opener);

    opener.remove();
    fixture.destroy();
  });

  it("filters to the empty line and ignores an outside key", async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    host.labels.set({
      commandPalette: "Actions",
      commandSearch: "Find an action",
      commandEmpty: "Nothing matches",
    });
    host.className.set("palette-surface");
    fixture.detectChanges();
    expect(part("command-palette")?.getAttribute("aria-label")).toBe("Actions");
    expect(part("command-palette")?.className).toContain("palette-surface");
    expect(part("command-input")?.getAttribute("aria-label")).toBe(
      "Find an action"
    );

    const input = part("command-input") as HTMLInputElement;
    input.value = "zzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();
    expect(part("command-empty")?.textContent).toContain("Nothing matches");
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    expect(host.open()).toBe(true);

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    fixture.detectChanges();
    expect(part("command-palette")).toBeNull();
    fixture.destroy();
  });

  it("closes on an outside press and stays for one inside", async () => {
    const fixture = await mount();
    const surface = part("command-palette");
    surface?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    fixture.detectChanges();
    expect(part("command-palette")).not.toBeNull();
    document.body.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true })
    );
    fixture.detectChanges();
    expect(part("command-palette")).toBeNull();
    fixture.destroy();
  });
  it("closes once from Escape on an actually focused command button", async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    const item = document.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="command-item"]:not([disabled])'
    )!;
    item.focus();
    expect(document.activeElement).toBe(item);
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    item.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(host.closed).toHaveBeenCalledOnce();
    expect(host.open()).toBe(false);
    fixture.destroy();
  });

  it("wraps Tab from the focused last command and Shift+Tab from the search input", async () => {
    const fixture = await mount();
    const input = part("command-input") as HTMLInputElement;
    const item = document.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="command-item"]:not([disabled])'
    )!;
    item.focus();
    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    item.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input);
    const back = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
      shiftKey: true,
    });
    input.dispatchEvent(back);
    expect(back.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(item);
    fixture.destroy();
  });

  it("dispatches input navigation once and preserves a command button's native activation", async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    const first = vi.fn();
    const second = vi.fn();
    const third = vi.fn();
    host.commands.set([
      { key: "first", label: "First", onSelect: first },
      { key: "second", label: "Second", onSelect: second },
      { key: "third", label: "Third", onSelect: third },
    ]);
    fixture.detectChanges();
    const input = part("command-input") as HTMLInputElement;
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      })
    );
    fixture.detectChanges();
    const items = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[data-adapttable-part="command-item"]'
      ),
    ];
    expect(items.map((item) => item.getAttribute("aria-selected"))).toEqual([
      "false",
      "true",
      "false",
    ]);
    items[2]!.focus();
    const enter = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    items[2]!.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(false);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(third).not.toHaveBeenCalled();
    // Synthetic key events do not synthesize a browser's native click.
    items[2]!.click();
    expect(third).toHaveBeenCalledOnce();
    expect(host.closed).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it("ignores composing Enter and lets the next ordinary Enter run once", async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    host.commands.set([
      { key: "greet", label: "Greet", onSelect: host.greeted },
    ]);
    fixture.detectChanges();
    const input = part("command-input") as HTMLInputElement;
    const composing = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
      isComposing: true,
    });
    input.dispatchEvent(composing);
    expect(composing.defaultPrevented).toBe(false);
    expect(host.greeted).not.toHaveBeenCalled();
    expect(host.closed).not.toHaveBeenCalled();
    expect(host.open()).toBe(true);
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(host.greeted).toHaveBeenCalledOnce();
    expect(host.closed).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it("closes only once when Escape bubbles from the search input", async () => {
    const fixture = await mount();
    part("command-input")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    expect(fixture.componentInstance.closed).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it("does not bind pointer listeners or focus controls on the server with DOM globals present", async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: "server" });
    const listener = vi.spyOn(document, "addEventListener");
    const fixture = await mount();
    expect(
      listener.mock.calls.filter(([event]) => event === "pointerdown")
    ).toEqual([]);
    const input = fixture.debugElement.query(By.directive(PaletteInput))
      .componentInstance as PaletteInput;
    const element = document.createElement("input");
    const focused = vi.spyOn(element, "focus");
    input.props().inputProps.ref(element);
    expect(focused).not.toHaveBeenCalled();
    fixture.destroy();
    listener.mockRestore();
  });
});
