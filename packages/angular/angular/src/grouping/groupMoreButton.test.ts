/**
 * The "show more" offer: its wording, and what pressing it asks for.
 */
import { resolveLabels } from "@adapttable/core";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AdaptGroupMoreButtonChrome,
  type GroupMoreButtonSlotProps,
} from "./groupMoreButton";
import { AdaptGroupToggleSpacer } from "./groupToggleSpacer";

@Component({
  selector: "test-more-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button type="button" (click)="props().onClick()">
    {{ props().label }}
  </button>`,
})
class TestButton {
  readonly props = input.required<GroupMoreButtonSlotProps>();
}

@Component({
  imports: [AdaptGroupMoreButtonChrome, AdaptGroupToggleSpacer],
  template: `
    <adapt-group-more-button-chrome
      [scope]="scope()"
      [remaining]="4"
      [groupKey]="groupKey()"
      [labels]="labels"
      [onShowMore]="onShowMore"
      [slots]="slots"
    />
    <adapt-group-toggle-spacer />
  `,
})
class Host {
  readonly scope = signal<"groups" | "rows">("groups");
  readonly groupKey = signal<string | undefined>(undefined);
  readonly labels = resolveLabels(undefined);
  readonly onShowMore = vi.fn();
  readonly slots = { Button: TestButton };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("AdaptGroupMoreButtonChrome", () => {
  it("offers more groups, then more rows in one group, and asks for each", async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const button = () => document.querySelector("button")!;

    expect(button().textContent.trim()).toBe("Show 4 more groups");
    button().click();
    expect(host.onShowMore).toHaveBeenLastCalledWith({
      scope: "groups",
      groupKey: undefined,
    });

    host.scope.set("rows");
    host.groupKey.set("group:team:Core");
    await fixture.whenStable();
    expect(button().textContent.trim()).toBe(host.labels.moreRowsInGroup(4));
    button().click();
    expect(host.onShowMore).toHaveBeenLastCalledWith({
      scope: "rows",
      groupKey: "group:team:Core",
    });
  });

  it("holds a toggle's width, hidden from assistive technology", async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const spacer = document.querySelector<HTMLElement>(
      '[data-adapttable-part="group-toggle-spacer"]'
    )!;
    expect(spacer.getAttribute("aria-hidden")).toBe("true");
    expect(spacer.style.width).toBe("1.5em");
  });
});
