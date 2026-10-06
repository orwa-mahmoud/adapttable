/** A standalone native modal keeps its scoped CDK direction when no override is supplied. */
import type { CommandPaletteInjectOptions } from "@adapttable/angular/adapter";
import { AdaptCommandPaletteLive } from "@adapttable/ng-zorro/command-palette";
import { BidiModule } from "@angular/cdk/bidi";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, expect, it } from "vitest";

@Component({
  imports: [BidiModule, AdaptCommandPaletteLive],
  template: `<div dir="rtl">
    <adapt-command-palette-live [props]="props" />
  </div>`,
})
class Host {
  readonly props: CommandPaletteInjectOptions = {
    labels: {},
    commandPalette: { open: true },
  };
}

afterEach(() => document.body.replaceChildren());

it("preserves native scoped direction for a standalone palette without an override", async () => {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const surface = document.querySelector<HTMLElement>(
    '[data-adapttable-part="command-palette"]'
  )!;
  expect(surface).not.toBeNull();
  expect(surface.closest<HTMLElement>("[dir]")?.dir).toBe("rtl");
  expect(surface.classList.contains("ant-modal-wrap-rtl")).toBe(true);
  fixture.destroy();
});
