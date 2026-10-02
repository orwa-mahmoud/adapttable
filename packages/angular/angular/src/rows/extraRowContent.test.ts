/**
 * A full-width extra row's content: a template, a component, or text.
 */
import {
  ChangeDetectionStrategy,
  Component,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { AdaptExtraRowContent } from "./extraRowContent";

@Component({
  selector: "test-banner",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<strong>From a component</strong>`,
})
class Banner {}

@Component({
  imports: [AdaptExtraRowContent],
  template: `
    <ng-template #note><em>From a template</em></ng-template>
    <div id="cell" [adaptExtraRowContent]="render()"></div>
  `,
})
class Host {
  readonly render = signal<(() => unknown) | undefined>(undefined);
  readonly note = viewChild.required<TemplateRef<unknown>>("note");
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("AdaptExtraRowContent", () => {
  it("draws what render returns: a template, a component, text, or nothing", async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const cell = () => document.getElementById("cell")!;
    expect(cell().textContent.trim()).toBe("");

    host.render.set(() => host.note());
    await fixture.whenStable();
    expect(cell().querySelector("em")?.textContent).toBe("From a template");

    host.render.set(() => Banner);
    await fixture.whenStable();
    expect(cell().querySelector("strong")?.textContent).toBe(
      "From a component"
    );

    host.render.set(() => 42);
    await fixture.whenStable();
    expect(cell().textContent.trim()).toBe("42");
    expect(cell().children).toHaveLength(0);
  });
});
