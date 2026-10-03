import { TestBed } from "@angular/core/testing";
import { TUI_DARK_MODE } from "@taiga-ui/core";
import { describe, expect, it } from "vitest";

describe("Taiga browser test environment", () => {
  it("provides a writable, resettable light-mode default without system media queries", () => {
    const darkMode = TestBed.inject(TUI_DARK_MODE);
    expect(darkMode()).toBe(false);
    darkMode.set(true);
    expect(darkMode()).toBe(true);
    darkMode.update((value) => !value);
    expect(darkMode()).toBe(false);
    darkMode.set(true);
    darkMode.reset();
    expect(darkMode()).toBe(false);
  });

  it("creates a fresh theme signal when the testing injector resets", () => {
    const previous = TestBed.inject(TUI_DARK_MODE);
    previous.set(true);
    TestBed.resetTestingModule();
    const current = TestBed.inject(TUI_DARK_MODE);
    expect(current).not.toBe(previous);
    expect(current()).toBe(false);
  });
});
