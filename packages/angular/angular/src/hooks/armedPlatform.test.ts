/** Armed controls must respect the server platform even with window-like globals. */
import { PLATFORM_ID, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { injectCommandPalette } from "../actions/commandPalette";
import { injectAssistantFloatingFits } from "../assistant/assistantPlacement";
import { injectHeaderFilterOverlay } from "../filters/headerFilterOverlay";
import { injectFindShortcut } from "../find/findMarks";
import { injectPopoverSpace } from "../layout/popoverSpace";

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [{ provide: PLATFORM_ID, useValue: "server" }],
  });
});

afterEach(() => {
  TestBed.resetTestingModule();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("armed controls on the server platform", () => {
  it("keeps command-palette model changes without registering document shortcuts", () => {
    const listen = vi.spyOn(document, "addEventListener");
    const palette = TestBed.runInInjectionContext(() =>
      injectCommandPalette(signal({ commandPalette: true, labels: {} }))
    );
    TestBed.tick();
    expect(palette().open).toBe(false);
    palette().show();
    expect(palette().open).toBe(true);
    expect(listen).not.toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("keeps an open header-filter model without browser dismiss listeners", () => {
    const listen = vi.spyOn(document, "addEventListener");
    const overlay = TestBed.runInInjectionContext(() =>
      injectHeaderFilterOverlay({
        def: { key: "city", type: "select", label: "City" },
        source: { extra: {}, setExtra: vi.fn(), setExtras: vi.fn() },
      })
    );
    overlay.setOpen(true);
    TestBed.tick();
    expect(overlay.open()).toBe(true);
    for (const event of ["mousedown", "touchstart", "keydown"]) {
      expect(listen).not.toHaveBeenCalledWith(event, expect.any(Function));
    }
  });

  it("does not attach find shortcuts to a server's window-like document", () => {
    const listen = vi.spyOn(document, "addEventListener");
    TestBed.runInInjectionContext(() =>
      injectFindShortcut({
        root: () => document.body,
        openBar: signal(vi.fn()),
      })
    );
    TestBed.tick();
    for (const event of ["pointerdown", "focusin", "keydown"]) {
      expect(listen).not.toHaveBeenCalledWith(
        event,
        expect.any(Function),
        true
      );
    }
  });

  it("does not read a server's viewport width or register assistant resize listeners", () => {
    const matchMedia = vi.fn();
    vi.stubGlobal("matchMedia", matchMedia);
    vi.stubGlobal("innerWidth", 320);
    const listen = vi.spyOn(window, "addEventListener");
    const fits = TestBed.runInInjectionContext(injectAssistantFloatingFits);
    expect(fits()).toBe(true);
    expect(matchMedia).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("does not measure or observe a server popover viewport", () => {
    const listen = vi.spyOn(window, "addEventListener");
    const origin = document.createElement("button");
    const measure = vi.spyOn(origin, "getBoundingClientRect");
    const height = TestBed.runInInjectionContext(() =>
      injectPopoverSpace({
        origin: () => origin,
        open: () => true,
        reserve: 16,
      })
    );
    TestBed.tick();
    expect(height()).toBe(360);
    expect(measure).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalledWith("resize", expect.any(Function));
    expect(listen).not.toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      true
    );
  });
});
