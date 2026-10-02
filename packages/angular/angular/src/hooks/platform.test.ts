/**
 * On a server platform the binding leaves the page's globals alone, even
 * where a server carries window-like ones, and reads the request's URL.
 */
import { PlatformLocation } from "@angular/common";
import { Injector, PLATFORM_ID, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { injectFullscreen } from "../layout/toolbar";
import { urlAdapterFor } from "../url/tableUrlState";
import { injectMeasuredWindowScrollMargin } from "../virtual/windowScrollMargin";
import { injectMediaQuery } from "./mediaQuery";
import { onBrowser } from "./platform";

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: "server" },
      {
        provide: PlatformLocation,
        useValue: { search: "?page=3&sort=name" },
      },
    ],
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("the binding on a server platform", () => {
  it("knows it is not in a browser", () => {
    expect(onBrowser(TestBed.inject(Injector))).toBe(false);
  });

  it("answers media queries false without asking matchMedia", () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    vi.stubGlobal("matchMedia", matchMedia);
    const narrow = TestBed.runInInjectionContext(() =>
      injectMediaQuery("(max-width: 768px)")
    );
    expect(narrow()).toBe(false);
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it("offers no fullscreen and listens to nothing", () => {
    const listen = vi.spyOn(document, "addEventListener");
    const element = document.createElement("div");
    const fullscreen = TestBed.runInInjectionContext(() =>
      injectFullscreen(signal(element))
    );
    TestBed.tick();
    expect(fullscreen().supported).toBe(false);
    fullscreen().toggle();
    expect(fullscreen().active).toBe(false);
    expect(listen).not.toHaveBeenCalledWith(
      "fullscreenchange",
      expect.any(Function)
    );
  });

  it("measures no window scroll margin", () => {
    const observe = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = observe;
        disconnect = vi.fn();
      }
    );
    const listen = vi.spyOn(globalThis, "addEventListener");
    const element = document.createElement("div");
    document.body.append(element);
    const margin = TestBed.runInInjectionContext(() =>
      injectMeasuredWindowScrollMargin({
        enabled: true,
        element: () => element,
      })
    );
    TestBed.tick();
    expect(margin()).toBe(0);
    expect(observe).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("starts a URL-synced table from the request's query string", () => {
    const adapter = urlAdapterFor({}, TestBed.inject(Injector));
    expect(adapter.getSearch()).toBe("page=3&sort=name");
    adapter.setSearch("page=4");
    expect(adapter.getSearch()).toBe("page=4");
  });

  it("keeps a table that does not sync the URL out of the request", () => {
    const adapter = urlAdapterFor({ urlSync: false }, TestBed.inject(Injector));
    expect(adapter.getSearch()).toBe("");
  });
});
