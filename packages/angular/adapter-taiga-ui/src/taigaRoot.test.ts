import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { AdaptTaigaRoot } from "./taigaRoot";

@Component({
  imports: [AdaptTaigaRoot],
  template: `<adapt-taiga-root
    data-root="outer"
    [theme]="theme()"
    [dir]="direction()"
  >
    <adapt-taiga-root data-root="inherited">
      <adapt-taiga-root data-root="leaf" />
    </adapt-taiga-root>
    <adapt-taiga-root data-root="override" theme="light" dir="ltr" />
  </adapt-taiga-root>`,
})
class Host {
  readonly theme = signal<"light" | "dark" | null>(null);
  readonly direction = signal<"ltr" | "rtl" | null>(null);
}

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.replaceChildren();
});

describe("Taiga root theme and direction scope", () => {
  it("inherits live values through nested roots while preserving an explicit override", async () => {
    const fixture = TestBed.createComponent(Host);
    const element = fixture.nativeElement as HTMLElement;
    document.body.append(element);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const roots = ["outer", "inherited", "leaf"].map((name) =>
      element.querySelector<HTMLElement>(`[data-root="${name}"] > tui-root`)!
    );
    const override = element.querySelector<HTMLElement>(
      '[data-root="override"] > tui-root'
    )!;
    const scope = (root: HTMLElement) => [
      root.getAttribute("tuiTheme"),
      root.getAttribute("dir"),
    ];
    expect(roots.map(scope)).toEqual([
      [null, null],
      [null, null],
      [null, null],
    ]);
    expect(scope(override)).toEqual(["light", "ltr"]);

    fixture.componentInstance.theme.set("dark");
    fixture.componentInstance.direction.set("rtl");
    await fixture.whenStable();
    expect(roots.map(scope)).toEqual([
      ["dark", "rtl"],
      ["dark", "rtl"],
      ["dark", "rtl"],
    ]);
    expect(scope(override)).toEqual(["light", "ltr"]);

    fixture.componentInstance.theme.set(null);
    fixture.componentInstance.direction.set(null);
    await fixture.whenStable();
    expect(roots.map(scope)).toEqual([
      [null, null],
      [null, null],
      [null, null],
    ]);
    expect(scope(override)).toEqual(["light", "ltr"]);
  });
});
