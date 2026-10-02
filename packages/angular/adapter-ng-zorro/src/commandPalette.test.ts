/**
 * The NG-ZORRO command palette: the toolbar button, the dialog, and a command.
 */
import type { ToolbarExtrasSlotProps } from "@adapttable/angular";
import { commandPalette } from "@adapttable/ng-zorro/command-palette";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { AdaptCommandPaletteButton } from "../command-palette/palette";
import { kitSelector } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

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

const part = (name: string) =>
  document.querySelector<HTMLElement>(kitSelector(name));

describe("command palette (NG-ZORRO Angular)", () => {
  it("opens from the toolbar button and runs a command", async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("command-palette")).toBeNull();
    part("command-palette-button")!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("command-palette")?.classList.contains("ant-modal-wrap")).toBe(
      true
    );
    expect(part("command-input")?.classList.contains("ant-input")).toBe(true);
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
    expect(greet?.classList.contains("ant-btn")).toBe(true);
    expect(greet?.getAttribute("tabindex")).toBe("-1");
    greet!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.greeted).toHaveBeenCalledOnce();
    expect(part("command-palette")).toBeNull();
  });

  it("preserves the binding keyboard model and restores focus after the real modal closes", async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger = part("command-palette-button")!;
    trigger.focus();
    trigger.click();
    await fixture.whenStable();
    const input = part("command-input") as HTMLInputElement;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
    part("command-palette")!
      .querySelector(".ant-modal")!
      .dispatchEvent(new Event("animationend", { bubbles: true }));
    await fixture.whenStable();
    expect(document.activeElement).toBe(input);
    input.value = "Greet";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await fixture.whenStable();
    const selected = document.getElementById(
      input.getAttribute("aria-activedescendant")!
    );
    expect(selected?.textContent?.trim()).toBe("Greet");
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await fixture.whenStable();
    expect(part("command-palette")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(fixture.componentInstance.greeted).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it("uses the table's local direction for the real modal and closes from its surface", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.dir.set("rtl");
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger = part("command-palette-button")!;
    trigger.focus();
    trigger.click();
    await fixture.whenStable();
    const modal = part("command-palette")!;
    expect(modal.classList.contains("ant-modal-wrap-rtl")).toBe(true);
    expect(modal.closest<HTMLElement>("[dir]")?.dir).toBe("rtl");
    modal.focus();
    modal.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true })
    );
    expect(part("command-palette")).toBe(modal);
    modal.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await fixture.whenStable();
    expect(part("command-palette")).toBeNull();
    expect(document.activeElement).toBe(trigger);

    fixture.componentInstance.dir.set("ltr");
    await fixture.whenStable();
    trigger.click();
    await fixture.whenStable();
    expect(
      part("command-palette")?.classList.contains("ant-modal-wrap-rtl")
    ).toBe(false);
    expect(part("command-palette")?.closest<HTMLElement>("[dir]")?.dir).toBe(
      "ltr"
    );
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
});
