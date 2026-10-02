/**
 * The saved-views management panel.
 *
 * The slots are plain HTML: what is being tested is what core decides — the
 * card's title, which controls exist on which row and in what order, what
 * each one does, that applying a view is clicking its name, and that
 * renaming can be abandoned without changing anything.
 */
import type { SavedView, TableLabels } from "@adapttable/core";
import { NgTemplateOutlet } from "@angular/common";
import {
  Component,
  effect,
  input,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import {
  AdaptSavedViewGlyph,
  AdaptSavedViewsPanelChrome,
  type SavedViewsPanelSlots,
} from "./savedViewsPanelChrome";

const VIEWS: readonly SavedView[] = [
  { name: "Mine", search: "t.q=a" },
  { name: "Team", search: "t.q=b", isDefault: true },
];

const layouts: object[] = [];

@Component({
  selector: "adapt-stub-views-surface",
  imports: [NgTemplateOutlet],
  template: `<div
    [class]="props().className"
    [attr.data-adapttable-part]="props()['data-adapttable-part']"
  >
    <h2>{{ props().title }}</h2>
    @if (props().children; as children) {
      <ng-container [ngTemplateOutlet]="children" />
    }
    @if (props().footer; as footer) {
      <footer><ng-container [ngTemplateOutlet]="footer" /></footer>
    }
  </div>`,
})
class StubSurface {
  readonly props = input.required<{
    title: string;
    className?: string;
    children?: TemplateRef<unknown>;
    footer?: TemplateRef<unknown>;
    "data-adapttable-part": string;
  }>();
}

@Component({
  selector: "adapt-stub-views-empty",
  template: `<p>{{ props().message }}</p>`,
})
class StubEmpty {
  readonly props = input.required<{ message: string }>();
}

@Component({
  selector: "adapt-stub-views-input",
  template: `<input
    [attr.aria-label]="props().label"
    [value]="props().value"
    (input)="edit($event)"
    (keydown)="key($event)"
  />`,
})
class StubInput {
  readonly props = input.required<{
    label: string;
    value: string;
    onChange: (next: string) => void;
    onCommit: () => void;
    onCancel: () => void;
  }>();

  protected edit(event: Event): void {
    this.props().onChange((event.target as HTMLInputElement).value);
  }

  protected key(event: KeyboardEvent): void {
    if (event.key === "Enter") this.props().onCommit();
    if (event.key === "Escape") this.props().onCancel();
  }
}

@Component({
  selector: "adapt-stub-views-row",
  imports: [NgTemplateOutlet],
  template: `<div [attr.data-adapttable-part]="props()['data-adapttable-part']">
    @if (props().isEditing) {
      <ng-container [ngTemplateOutlet]="props().name" />
    } @else {
      <button
        type="button"
        [attr.title]="props().applyLabel"
        (click)="props().onApply()"
      >
        {{ props().viewName }}
      </button>
    }
    @if (props().isDefault) {
      <em>{{ props().defaultLabel }}</em>
    }
    @if (props().readOnly) {
      <span>{{ props().readOnlyLabel }}</span>
    }
    @for (control of props().controls; track control.key) {
      <button
        type="button"
        [attr.data-control]="control.key"
        [attr.aria-label]="control.label"
        [attr.aria-pressed]="control.pressed"
        [disabled]="control.onPress === undefined"
        (click)="control.onPress?.()"
      ></button>
    }
  </div>`,
})
class StubRow {
  readonly props = input.required<{
    "data-adapttable-part": string;
    name?: TemplateRef<unknown>;
    viewName: string;
    isEditing: boolean;
    isDefault: boolean;
    readOnly: boolean;
    defaultLabel: string;
    readOnlyLabel: string;
    applyLabel: string;
    onApply: () => void;
    layout: object;
    controls: readonly {
      key: string;
      label: string;
      onPress?: () => void;
      pressed?: boolean;
    }[];
  }>();

  constructor() {
    effect(() => {
      layouts.push(this.props().layout);
    });
  }
}

const SLOTS: SavedViewsPanelSlots = {
  Surface: StubSurface,
  Row: StubRow,
  Input: StubInput,
  Empty: StubEmpty,
};

@Component({
  imports: [AdaptSavedViewsPanelChrome],
  template: `
    <ng-template #note>Kept from last year.</ng-template>
    <adapt-saved-views-panel-chrome
      [views]="views()"
      [onApply]="onApply"
      [onRename]="onRename"
      [onMove]="onMove"
      [onSetDefault]="onSetDefault"
      [onRemove]="onRemove"
      [slots]="slots"
      [labels]="labels()"
      [footer]="footer()"
      [className]="className()"
    />
  `,
})
class Host {
  readonly views = signal<readonly SavedView[]>(VIEWS);
  readonly labels = signal<Partial<TableLabels> | undefined>(undefined);
  readonly footer = signal<TemplateRef<unknown> | string | undefined>(
    undefined
  );
  readonly className = signal<string | undefined>("views");
  readonly onApply = vi.fn<(name: string) => void>();
  readonly onRename = vi.fn<(from: string, to: string) => void>();
  readonly onMove = vi.fn<(name: string, delta: number) => void>();
  readonly onSetDefault = vi.fn<(name: string) => void>();
  readonly onRemove = vi.fn<(name: string) => void>();
  readonly slots = SLOTS;
  private readonly note = viewChild.required<TemplateRef<unknown>>("note");

  useNote(): void {
    this.footer.set(this.note());
  }
}

function mount(): {
  host: Host;
  root: HTMLElement;
  detect: () => void;
} {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    root: fixture.nativeElement as HTMLElement,
    detect: () => {
      fixture.detectChanges();
    },
  };
}

function controlButtons(root: ParentNode, key: string): HTMLButtonElement[] {
  return [
    ...root.querySelectorAll<HTMLButtonElement>(`[data-control="${key}"]`),
  ];
}

describe("AdaptSavedViewsPanelChrome", () => {
  it("lists every view, applies by name, and offers the five controls", () => {
    layouts.length = 0;
    const { root, host } = mount();
    expect(root.querySelector("h2")?.textContent).toBe("Saved views");
    expect(
      root.querySelector("[data-adapttable-part='saved-views-panel']")
    ).toBeTruthy();
    const names = [...root.querySelectorAll("button")].filter(
      (button) => button.getAttribute("data-control") === null
    );
    expect(names.map((button) => button.textContent?.trim())).toEqual([
      "Mine",
      "Team",
    ]);
    expect(names[0]?.getAttribute("title")).toBe("Apply view");
    names[0]?.click();
    expect(host.onApply).toHaveBeenCalledWith("Mine");
    expect(root.querySelector("em")?.textContent).toBe("Default");
    const mine = root.querySelectorAll(
      "[data-adapttable-part='saved-view-row']"
    )[0];
    expect(mine).toBeTruthy();
    expect(
      [...(mine?.querySelectorAll("[data-control]") ?? [])].map((node) =>
        node.getAttribute("data-control")
      )
    ).toEqual(["rename", "moveUp", "moveDown", "default", "remove"]);
    const up = controlButtons(root, "moveUp");
    const down = controlButtons(root, "moveDown");
    expect(up[0]?.disabled).toBe(true);
    expect(down[0]?.disabled).toBe(false);
    expect(up[1]?.disabled).toBe(false);
    expect(down[1]?.disabled).toBe(true);
    const defaults = controlButtons(root, "default");
    expect(defaults[0]?.getAttribute("aria-pressed")).toBe("false");
    expect(defaults[1]?.getAttribute("aria-pressed")).toBe("true");
    up[1]?.click();
    expect(host.onMove).toHaveBeenCalledWith("Team", -1);
    defaults[0]?.click();
    expect(host.onSetDefault).toHaveBeenCalledWith("Mine");
    controlButtons(root, "remove")[0]?.click();
    expect(host.onRemove).toHaveBeenCalledWith("Mine");
    expect(layouts[0]).toBe(layouts[1]);
    expect(layouts[0]).toMatchObject({
      row: { display: "flex", flexWrap: "wrap" },
      control: { flex: "0 0 auto" },
    });
  });

  it("disables every control on a read-only view", () => {
    const { root, host, detect } = mount();
    host.views.set([{ name: "Shared", search: "", readOnly: true }]);
    host.className.set(undefined);
    detect();
    const row = root.querySelector("[data-adapttable-part='saved-view-row']");
    const buttons = [...(row?.querySelectorAll("button") ?? [])];
    const cluster = buttons.filter(
      (button) => button.getAttribute("data-control") !== null
    );
    expect(cluster).toHaveLength(5);
    expect(cluster.every((button) => button.disabled)).toBe(true);
    expect(row?.textContent).toContain("Read-only");
    buttons[0]?.click();
    expect(host.onApply).toHaveBeenCalledWith("Shared");
  });

  it("renames on Enter and abandons the draft on Escape", () => {
    const { root, host, detect } = mount();
    controlButtons(root, "rename")[0]?.click();
    detect();
    const box = root.querySelector("input");
    expect(box?.value).toBe("Mine");
    expect(box?.getAttribute("aria-label")).toBe("View name");
    if (!box) throw new Error("rename field");
    box.value = "New";
    box.dispatchEvent(new Event("input"));
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    detect();
    expect(host.onRename).toHaveBeenCalledWith("Mine", "New");
    expect(root.querySelector("input")).toBeNull();

    controlButtons(root, "rename")[0]?.click();
    detect();
    const again = root.querySelector("input");
    if (!again) throw new Error("rename field");
    again.value = "Nope";
    again.dispatchEvent(new Event("input"));
    again.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    detect();
    expect(host.onRename).toHaveBeenCalledTimes(1);
    expect(root.querySelector("input")).toBeNull();
    expect(root.textContent).toContain("Mine");
  });

  it("says the list is empty, and renders a string or a template footer", () => {
    const { root, host, detect } = mount();
    host.views.set([]);
    host.labels.set({ savedViews: "Library" });
    detect();
    expect(
      root.querySelector("[data-adapttable-part='saved-view-row']")
    ).toBeNull();
    expect(root.textContent?.match(/Library/g)?.length).toBeGreaterThan(1);

    host.footer.set("Upgraded on load.");
    detect();
    expect(root.querySelector("footer")?.textContent).toContain(
      "Upgraded on load."
    );

    host.useNote();
    detect();
    expect(root.querySelector("footer")?.textContent).toContain(
      "Kept from last year."
    );
  });
});

@Component({
  imports: [AdaptSavedViewGlyph],
  template: `<adapt-saved-view-glyph [glyph]="glyph()" />`,
})
class GlyphHost {
  readonly glyph = signal({ paths: ["M0 0"], filled: false });
}

describe("AdaptSavedViewGlyph", () => {
  it("fills the current default and strokes the rest", () => {
    const fixture = TestBed.createComponent(GlyphHost);
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("fill")).toBe("none");
    expect(svg.querySelector("path")?.getAttribute("d")).toBe("M0 0");
    fixture.componentInstance.glyph.set({ paths: ["M1 1"], filled: true });
    fixture.detectChanges();
    expect(svg.getAttribute("fill")).toBe("currentColor");
    expect(svg.querySelector("path")?.getAttribute("d")).toBe("M1 1");
  });
});
