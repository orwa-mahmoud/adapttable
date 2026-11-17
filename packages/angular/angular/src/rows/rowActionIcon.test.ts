/**
 * A row action's icon: a template or a standalone component draws an
 * icon-only button; anything else leaves the label.
 */
import {
  ChangeDetectionStrategy,
  Component,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { rowActionIcon } from "./rowActionIcon";

@Component({
  selector: "test-glyph",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg></svg>`,
})
class Glyph {}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-template #icon><svg></svg></ng-template>`,
})
class Host {
  readonly icon = viewChild.required<TemplateRef<unknown>>("icon");
}

describe("rowActionIcon", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("reads a template icon", () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const template = fixture.componentInstance.icon();
    expect(rowActionIcon({ icon: template })).toEqual({ template });
  });

  it("reads a standalone component icon", () => {
    expect(rowActionIcon({ icon: Glyph })).toEqual({ component: Glyph });
  });

  it("leaves the label for a missing or non-renderable icon", () => {
    expect(rowActionIcon({})).toBeNull();
    expect(rowActionIcon({ icon: "✎" })).toBeNull();
    expect(rowActionIcon({ icon: class NotAComponent {} })).toBeNull();
  });
});
