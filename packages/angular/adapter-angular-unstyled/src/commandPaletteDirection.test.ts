/** Standalone kit controls retain ambient direction when no override is supplied. */
import type { CommandPaletteInjectOptions } from "@adapttable/angular/adapter";
import { AdaptCommandPaletteLive } from "@adapttable/angular-unstyled/command-palette";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, expect, it } from "vitest";

@Component({
  imports: [AdaptCommandPaletteLive],
  template: `<div data-direction-scope [dir]="dir()">
    <adapt-command-palette-live [props]="props" />
  </div>`,
})
class Host {
  readonly dir = signal<"ltr" | "rtl">("rtl");
  readonly props: CommandPaletteInjectOptions = {
    labels: {},
    commandPalette: { open: true },
  };
}

afterEach(() => document.body.replaceChildren());

it("preserves ambient direction for a standalone palette with no direction option", async () => {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const surface = document.querySelector<HTMLElement>(
    '[data-adapttable-part="command-palette"]'
  )!;
  const scope = document.querySelector<HTMLElement>("[data-direction-scope]");
  expect(surface).not.toBeNull();
  expect(surface.closest<HTMLElement>("[dir]")?.dir).toBe("rtl");
  expect(surface.closest<HTMLElement>("[dir]")).toBe(scope);
  fixture.componentInstance.dir.set("ltr");
  await fixture.whenStable();
  expect(surface.closest<HTMLElement>("[dir]")?.dir).toBe("ltr");
  expect(surface.closest<HTMLElement>("[dir]")).toBe(scope);
  fixture.destroy();
});
