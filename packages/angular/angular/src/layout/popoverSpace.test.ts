import { DOCUMENT } from "@angular/common";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { injectPopoverSpace } from "./popoverSpace";

@Component({ template: `{{ height() }}` })
class Host {
  readonly origin = signal<HTMLElement | undefined>(undefined);
  readonly open = signal(false);
  readonly allowAbove = signal(false);
  readonly height = injectPopoverSpace({
    origin: this.origin,
    open: this.open,
    reserve: 32,
    allowAbove: this.allowAbove,
  });
}

afterEach(() => {
  TestBed.resetTestingModule();
  vi.restoreAllMocks();
});

describe("native popover viewport space", () => {
  it("includes above-origin room only when enabled and bounds scrolled origins", () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    const origin = document.createElement("button");
    let top = window.innerHeight - 48;
    vi.spyOn(origin, "getBoundingClientRect").mockImplementation(() =>
      DOMRect.fromRect({ y: top, height: 32 })
    );
    host.origin.set(origin);
    host.open.set(true);
    fixture.detectChanges();
    TestBed.tick();
    expect(host.height()).toBe(80);
    host.allowAbove.set(true);
    fixture.detectChanges();
    TestBed.tick();
    expect(host.height()).toBe(top - 32);
    top = 20;
    window.dispatchEvent(new Event("resize"));
    expect(host.height()).toBe(window.innerHeight - 84);
    top = window.innerHeight + 200;
    document.dispatchEvent(new Event("scroll"));
    expect(host.height()).toBe(window.innerHeight - 32);
    top = -200;
    document.dispatchEvent(new Event("scroll"));
    expect(host.height()).toBe(window.innerHeight - 32);
    host.allowAbove.set(false);
    top = window.innerHeight - 48;
    fixture.detectChanges();
    TestBed.tick();
    expect(host.height()).toBe(80);
  });

  it("tracks the open origin on resize and ancestor scrolling, then releases listeners", () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    const origin = document.createElement("button");
    let bottom = 400;
    vi.spyOn(origin, "getBoundingClientRect").mockImplementation(() =>
      DOMRect.fromRect({ y: bottom - 32, height: 32 })
    );
    const remove = vi.spyOn(window, "removeEventListener");
    host.origin.set(origin);
    host.open.set(true);
    fixture.detectChanges();
    TestBed.tick();
    expect(host.height()).toBe(window.innerHeight - bottom - 32);
    bottom = 500;
    window.dispatchEvent(new Event("resize"));
    expect(host.height()).toBe(window.innerHeight - bottom - 32);
    bottom = 300;
    document.dispatchEvent(new Event("scroll"));
    expect(host.height()).toBe(window.innerHeight - bottom - 32);
    bottom = window.innerHeight;
    window.dispatchEvent(new Event("resize"));
    expect(host.height()).toBe(80);
    host.open.set(false);
    bottom = 100;
    window.dispatchEvent(new Event("resize"));
    expect(host.height()).toBe(80);
    host.open.set(true);
    host.origin.set(undefined);
    window.dispatchEvent(new Event("resize"));
    expect(host.height()).toBe(80);
    fixture.destroy();
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function), true);
  });

  it("keeps below-only room within the viewport when the origin scrolls above it", () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    const origin = document.createElement("button");
    let bottom = -184;
    vi.spyOn(origin, "getBoundingClientRect").mockImplementation(() =>
      DOMRect.fromRect({ y: bottom - 36, height: 36 })
    );
    host.origin.set(origin);
    host.open.set(true);
    fixture.detectChanges();
    TestBed.tick();
    expect(host.height()).toBe(window.innerHeight - 32);
    bottom = 36;
    document.dispatchEvent(new Event("scroll"));
    expect(host.height()).toBe(window.innerHeight - 36 - 32);
  });

  it("does not require a browser window when rendered on the server", () => {
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: null } }],
    });
    const injector = TestBed.inject(DOCUMENT);
    expect(injector.defaultView).toBeNull();
    const height = TestBed.runInInjectionContext(() =>
      injectPopoverSpace({
        origin: () => undefined,
        open: () => true,
        reserve: 16,
      })
    );
    TestBed.tick();
    expect(height()).toBe(360);
  });
});
