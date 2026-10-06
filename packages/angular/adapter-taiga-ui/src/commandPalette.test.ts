import {
  type TableLabels,
  type ToolbarExtrasSlotProps,
} from "@adapttable/angular";
import { commandPalette } from "@adapttable/taiga-ui/command-palette";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { AdaptCommandPaletteButton } from "../command-palette/palette";
import { AdaptDataTable } from "./dataTable";

/**
 * The unstyled command palette: the toolbar button, the dialog, and a command.
 */

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [{ id: "1", name: "Ada" }];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [features]="features"
      [dir]="dir()"
    />
  `,
})
class Host {
  readonly rows = ROWS;
  readonly dir = signal<"ltr" | "rtl">("ltr");
  readonly columns = [
    { key: "name", header: "Name", accessor: (row: Row) => row.name },
  ];
  readonly rowKey = (row: Row) => row.id;
  readonly greeted = vi.fn();
  readonly features = [
    commandPalette({
      button: true,
      commands: [
        {
          key: "greet",
          label: "Greet",
          onSelect: () => {
            this.greeted();
          },
        },
      ],
    }),
  ];
}

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [features]="features"
      [labels]="labels()"
      [dir]="dir()"
    />
  `,
})
class ControlledHost extends Host {
  readonly paletteOpen = signal(false);
  readonly labels = signal<TableLabels>({ commandPalette: "Table commands" });
  readonly onOpenChange = vi.fn((open: boolean) => {
    this.paletteOpen.set(open);
  });
  override readonly features = [
    commandPalette({
      button: true,
      open: this.paletteOpen.asReadonly(),
      onOpenChange: this.onOpenChange,
      commands: [{ key: "greet", label: "Greet", onSelect: this.greeted }],
    }),
  ];
}

const part = (name: string) =>
  document.querySelector<HTMLElement>(
    `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
  );

describe("command palette (Taiga UI Angular)", () => {
  it("opens from the toolbar button and runs a command", async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("command-palette")).toBeNull();
    part("command-palette-button")!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("command-palette")).not.toBeNull();
    expect(part("command-input")).not.toBeNull();
    expect(part("command-list")).not.toBeNull();
    const input = part("command-input") as HTMLInputElement;
    input.value = "zzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("command-empty")?.textContent).toContain("No matching command");
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    const greet = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="command-item"]'
      ),
    ].find((item) => item.textContent?.includes("Greet"));
    expect(greet).toBeTruthy();
    greet!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.greeted).toHaveBeenCalledOnce();
    expect(part("command-palette")).toBeNull();
  });

  it("follows external open state and updates the mounted palette's labels", async () => {
    const fixture = TestBed.createComponent(ControlledHost);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const trigger = part("command-palette-button")!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(part("command-palette")).toBeNull();

    host.paletteOpen.set(true);
    await fixture.whenStable();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(part("command-palette")?.getAttribute("aria-label")).toBe(
      "Table commands"
    );
    expect(part("command-list")?.textContent).toContain("Greet");
    const input = part("command-input") as HTMLInputElement;
    input.value = "zzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await fixture.whenStable();
    expect(part("command-empty")?.textContent).toContain("No matching command");

    host.labels.set({
      commandPalette: "Available actions",
      commandSearch: "Find an action",
      commandEmpty: "No action found",
    });
    await fixture.whenStable();
    expect(trigger.textContent?.trim()).toBe("Available actions");
    expect(part("command-palette")?.getAttribute("aria-label")).toBe(
      "Available actions"
    );
    expect(part("command-list")?.getAttribute("aria-label")).toBe(
      "Available actions"
    );
    expect(input.getAttribute("aria-label")).toBe("Find an action");
    expect(input.placeholder).toBe("Find an action");
    expect(part("command-empty")?.textContent?.trim()).toBe("No action found");

    host.paletteOpen.set(false);
    await fixture.whenStable();
    expect(part("command-palette")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(host.onOpenChange).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it("updates the host signal from the toolbar, Escape, shortcut and selected command", async () => {
    const fixture = TestBed.createComponent(ControlledHost);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const trigger = part("command-palette-button")!;
    expect(host.paletteOpen()).toBe(false);
    expect(part("command-palette")).toBeNull();

    trigger.click();
    await fixture.whenStable();
    expect(host.paletteOpen()).toBe(true);
    expect(host.onOpenChange.mock.calls).toEqual([[true]]);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(part("command-list")?.textContent).toContain("Greet");
    part("command-input")!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await fixture.whenStable();
    expect(host.paletteOpen()).toBe(false);
    expect(part("command-palette")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
    );
    await fixture.whenStable();
    expect(host.paletteOpen()).toBe(true);
    expect(host.onOpenChange.mock.calls).toEqual([[true], [false], [true]]);
    const greet = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="command-item"]'
      ),
    ].find((item) => item.textContent?.trim() === "Greet");
    expect(greet?.textContent?.trim()).toBe("Greet");
    greet!.click();
    await fixture.whenStable();
    expect(host.greeted).toHaveBeenCalledOnce();
    expect(host.paletteOpen()).toBe(false);
    expect(host.onOpenChange.mock.calls).toEqual([
      [true],
      [false],
      [true],
      [false],
    ]);
    expect(part("command-palette")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fixture.destroy();
  });

  it("keeps host signals and toolbar callbacks independent across mounted tables", async () => {
    const first = TestBed.createComponent(ControlledHost);
    const second = TestBed.createComponent(ControlledHost);
    const firstHost = first.componentInstance;
    const secondHost = second.componentInstance;
    firstHost.labels.set({ commandPalette: "First commands" });
    secondHost.labels.set({ commandPalette: "Second commands" });
    document.body.append(first.nativeElement, second.nativeElement);
    first.autoDetectChanges();
    second.autoDetectChanges();
    await Promise.all([first.whenStable(), second.whenStable()]);
    const dialogs = () =>
      [
        ...document.querySelectorAll<HTMLElement>(
          '[data-adapttable-part="command-palette"]'
        ),
      ]
        .map((dialog) => dialog.getAttribute("aria-label"))
        .sort((left, right) => (left ?? "").localeCompare(right ?? ""));
    const trigger = second.nativeElement.querySelector(
      '[data-adapttable-part="command-palette-button"]'
    ) as HTMLButtonElement;
    expect(dialogs()).toEqual([]);

    firstHost.paletteOpen.set(true);
    await first.whenStable();
    expect(dialogs()).toEqual(["First commands"]);
    expect(secondHost.paletteOpen()).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.click();
    await second.whenStable();
    expect(dialogs()).toEqual(["First commands", "Second commands"]);
    expect(firstHost.paletteOpen()).toBe(true);
    expect(secondHost.paletteOpen()).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    firstHost.paletteOpen.set(false);
    await first.whenStable();
    expect(dialogs()).toEqual(["Second commands"]);
    expect(firstHost.onOpenChange).not.toHaveBeenCalled();
    expect(secondHost.paletteOpen()).toBe(true);
    part("command-input")!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await second.whenStable();
    expect(dialogs()).toEqual([]);
    expect(firstHost.paletteOpen()).toBe(false);
    expect(secondHost.paletteOpen()).toBe(false);
    expect(firstHost.onOpenChange).not.toHaveBeenCalled();
    expect(secondHost.onOpenChange.mock.calls).toEqual([[true], [false]]);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    first.destroy();
    second.destroy();
  });

  it("reports open requests while a plain controlled false keeps the palette closed", async () => {
    const fixture = TestBed.createComponent(Host);
    const onOpenChange = vi.fn();
    fixture.componentInstance.features[0] = commandPalette({
      button: true,
      open: false,
      onOpenChange,
    });
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger = part("command-palette-button")!;
    trigger.click();
    await fixture.whenStable();
    expect(onOpenChange.mock.calls).toEqual([[true]]);
    expect(part("command-palette")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fixture.destroy();
  });

  it("omits the toolbar button unless the host asks, and draws nothing without the token", () => {
    expect(commandPalette(false)).toBeTruthy();
    expect(commandPalette({ button: false })).toBeTruthy();

    @Component({
      imports: [AdaptCommandPaletteButton],
      template: `<adapt-command-palette-button [props]="props" />`,
    })
    class BareButton {
      readonly props = {
        labels: { commandPalette: "Commands" },
      } as unknown as ToolbarExtrasSlotProps;
    }

    const fixture = TestBed.createComponent(BareButton);
    fixture.detectChanges();
    expect(part("command-palette-button")).toBeNull();
    fixture.destroy();
  });
  it("keeps the actual palette surface in the table's live direction while open", async () => {
    const fixture = TestBed.createComponent(ControlledHost);
    const host = fixture.componentInstance;
    host.dir.set("rtl");
    host.paletteOpen.set(true);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const surface = part("command-palette")!;
    const input = part("command-input") as HTMLInputElement;
    expect(surface.closest<HTMLElement>("[dir]")?.dir).toBe("rtl");
    input.value = "Greet";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await fixture.whenStable();
    host.dir.set("ltr");
    await fixture.whenStable();
    expect(part("command-palette")).toBe(surface);
    expect(surface.closest<HTMLElement>("[dir]")?.dir).toBe("ltr");
    expect(part("command-input")).toBe(input);
    expect(input.value).toBe("Greet");
    expect(host.paletteOpen()).toBe(true);
    expect(host.onOpenChange).not.toHaveBeenCalled();
    host.dir.set("rtl");
    await fixture.whenStable();
    expect(surface.closest<HTMLElement>("[dir]")?.dir).toBe("rtl");
    expect(part("command-input")).toBe(input);
    fixture.destroy();
  });
});
