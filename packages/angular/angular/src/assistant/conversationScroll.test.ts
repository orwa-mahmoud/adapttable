/** The transcript never steals an earlier reading position. */
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { injectConversationScroll } from "./conversationScroll";

@Component({ template: `<span>{{ scroll.hasUnseen() }}</span>` })
class ScrollHost {
  readonly count = signal(0);
  readonly element = signal<HTMLElement | undefined>(undefined);
  readonly scroll = injectConversationScroll(this.count, this.element);
}
function scrollingElement(): HTMLElement {
  const element = document.createElement("div");
  Object.defineProperties(element, {
    scrollHeight: { value: 1000 },
    clientHeight: { value: 100 },
  });
  return element;
}

describe("injectConversationScroll", () => {
  it("names the hook when called outside an injection context", () => {
    const count = signal(0);
    const element = signal<HTMLElement | undefined>(undefined);
    expect(() => injectConversationScroll(count, element)).toThrow(
      /injectConversationScroll\(\).*injection context/
    );
  });
  it("handles missing elements and does not scroll on reattachment alone", async () => {
    const fixture = TestBed.createComponent(ScrollHost);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    host.scroll.onScroll();
    host.scroll.jumpToLatest();
    host.count.set(1);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = scrollingElement();
    element.scrollTop = 200;
    host.element.set(element);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.scrollTop).toBe(200);
    host.count.set(2);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.scrollTop).toBe(1000);
    fixture.destroy();
  });
  it("treats 48px as near, 49px as away, and clears the notice when the reader reaches the end", async () => {
    const fixture = TestBed.createComponent(ScrollHost);
    const host = fixture.componentInstance;
    const element = scrollingElement();
    host.element.set(element);
    fixture.detectChanges();
    await fixture.whenStable();
    element.scrollTop = 851;
    host.scroll.onScroll();
    host.count.set(1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.scroll.hasUnseen()).toBe(true);
    expect(element.scrollTop).toBe(851);
    host.count.set(0);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.scroll.hasUnseen()).toBe(true);
    expect(element.scrollTop).toBe(851);
    element.scrollTop = 852;
    host.scroll.onScroll();
    expect(host.scroll.hasUnseen()).toBe(false);
    host.count.set(2);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.scrollTop).toBe(1000);
    element.scrollTop = 100;
    host.scroll.onScroll();
    host.count.set(3);
    fixture.detectChanges();
    await fixture.whenStable();
    host.scroll.jumpToLatest();
    expect(element.scrollTop).toBe(1000);
    expect(host.scroll.hasUnseen()).toBe(false);
    fixture.destroy();
  });
});
