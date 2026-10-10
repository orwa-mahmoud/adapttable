import type { ElementRef } from "@adapttable/vue";
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

import { useControlElementRef } from "../src/controls/useControlElementRef";

const settle = async () => {
  await nextTick();
  await nextTick();
};

describe("Nuxt control ref synchronous disposal", () => {
  it.each(["input", "button"] as const)(
    "does not attach or release a later %s owner after disposal during initial attachment",
    (tag) => {
      const scope = effectScope();
      const element = document.createElement(tag);
      const events: [string, HTMLElement | null][] = [];
      const first: ElementRef<HTMLElement> = (node) => {
        events.push(["first", node]);
        if (node) scope.stop();
      };
      const later = vi.fn((node: HTMLElement | null) => {
        events.push(["later", node]);
      });
      scope.run(() =>
        useControlElementRef(
          () => element,
          () => [first, later]
        )
      );
      expect(events).toEqual([
        ["first", element],
        ["first", null],
      ]);
      expect(later).not.toHaveBeenCalled();
      scope.stop();
      expect(events).toHaveLength(2);
    }
  );

  it("does not attach a later owner when disposal happens after the target becomes available", async () => {
    const scope = effectScope();
    const target = shallowRef<HTMLElement | null>(null);
    const first = vi.fn((node: HTMLElement | null) => {
      if (node) scope.stop();
    });
    const later = vi.fn();
    scope.run(() =>
      useControlElementRef(
        () => target.value,
        () => [first, later]
      )
    );
    expect(first).not.toHaveBeenCalled();
    const element = document.createElement("input");
    target.value = element;
    await settle();
    expect(first.mock.calls).toEqual([[element], [null]]);
    expect(later).not.toHaveBeenCalled();
    target.value = document.createElement("input");
    await settle();
    expect(first.mock.calls).toEqual([[element], [null]]);
    expect(later).not.toHaveBeenCalled();
  });

  it("releases every previously attached owner once when a release callback disposes the scope", async () => {
    const scope = effectScope();
    const element = document.createElement("button");
    const first = vi.fn((node: HTMLElement | null) => {
      if (node === null) scope.stop();
    });
    const later = vi.fn();
    const replacement = vi.fn();
    const owners = shallowRef<readonly ElementRef<HTMLElement>[]>([
      first,
      later,
    ]);
    scope.run(() =>
      useControlElementRef(
        () => element,
        () => owners.value
      )
    );
    owners.value = [replacement];
    await settle();
    expect(first.mock.calls).toEqual([[element], [null]]);
    expect(later.mock.calls).toEqual([[element], [null]]);
    expect(replacement).not.toHaveBeenCalled();
    scope.stop();
    expect(first).toHaveBeenCalledTimes(2);
    expect(later).toHaveBeenCalledTimes(2);
  });
});
