/**
 * Media queries as signals: they follow the viewport, read false where there
 * is no `matchMedia`, and work inside an injection context.
 */
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { injectMediaQuery } from "./mediaQuery";
import {
  ADAPTTABLE_KIT_MOTION_OFF,
  injectPrefersReducedMotion,
} from "./prefersReducedMotion";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("injectMediaQuery", () => {
  it("follows the query as the viewport changes", () => {
    let listener: ((event: { matches: boolean }) => void) | undefined;
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: (_type: string, next: typeof listener) => {
        listener = next;
      },
      removeEventListener: () => undefined,
    }));
    const wide = TestBed.runInInjectionContext(() =>
      injectMediaQuery("(min-width: 900px)")
    );
    expect(wide()).toBe(false);
    listener!({ matches: true });
    expect(wide()).toBe(true);
  });

  it("reads false where there is no matchMedia, as on the server", () => {
    vi.stubGlobal("matchMedia", undefined);
    const reduced = TestBed.runInInjectionContext(() =>
      injectPrefersReducedMotion()
    );
    expect(reduced()).toBe(false);
  });

  it("stays still when a UI library turns motion off", () => {
    vi.stubGlobal("matchMedia", undefined);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ADAPTTABLE_KIT_MOTION_OFF,
          useValue: signal(true).asReadonly(),
        },
      ],
    });
    const reduced = TestBed.runInInjectionContext(() =>
      injectPrefersReducedMotion()
    );
    expect(reduced()).toBe(true);
    TestBed.resetTestingModule();
  });
});
