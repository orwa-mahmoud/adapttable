import { DOCUMENT } from "@angular/common";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { injectPopoverSpace } from "./popoverSpace";

@Component({ template: `{{ height() }}` })
class Host {
  readonly origin = signal<HTMLElement | undefined>(undefined);
  readonly open = signal(false);
  readonly height = injectPopoverSpace({
    origin: this.origin,
    open: this.open,
    reserve: 32,
  });
}

afterEach(() => {
  TestBed.resetTestingModule();
  vi.restoreAllMocks();
});

describe("native popover viewport space", () => {
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
