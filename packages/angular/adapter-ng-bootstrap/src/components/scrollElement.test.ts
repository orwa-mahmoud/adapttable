import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { AdaptDesktopTable } from "./desktopTable";

describe("scroll element before the view exists", () => {
  it("desktop table has no scroll element yet", () => {
    const fixture = TestBed.createComponent(AdaptDesktopTable);
    expect(fixture.componentInstance.scrollElement()).toBeNull();
    fixture.destroy();
  });
});
