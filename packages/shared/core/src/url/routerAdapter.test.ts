/**
 * The router adapter.
 *
 * Small enough that the tests are mostly about the two things a hand-copied
 * recipe got wrong: whether the search string carries its "?", and whether a
 * change is a push or a replace.
 */
import { describe, expect, it, vi } from "vitest";

import { routerUrlAdapter } from "./routerAdapter";

describe("routerUrlAdapter", () => {
  it("reports the router's current search", () => {
    const adapter = routerUrlAdapter({
      search: "page=2&q=ali",
      navigate: () => undefined,
    });

    expect(adapter.getSearch()).toBe("page=2&q=ali");
  });

  it("tolerates a search that still carries its question mark", () => {
    // Every router spells this differently and none of them are wrong.
    const adapter = routerUrlAdapter({
      search: "?page=2",
      navigate: () => undefined,
    });

    expect(adapter.getSearch()).toBe("page=2");
  });

  it("replaces by default, because a keystroke is not a page", () => {
    const navigate = vi.fn();
    routerUrlAdapter({ search: "", navigate }).setSearch("q=a");

    expect(navigate).toHaveBeenCalledWith("q=a", { push: false });
  });

  it("pushes when the caller asks", () => {
    const navigate = vi.fn();
    routerUrlAdapter({ search: "", navigate }).setSearch("q=a", { push: true });

    expect(navigate).toHaveBeenCalledWith("q=a", { push: true });
  });

  it("reports no external changes, and unsubscribes cleanly", () => {
    // The router's own re-render IS the notification; subscribing would
    // deliver it twice and re-render for free.
    const onChange = vi.fn();
    const unsubscribe = routerUrlAdapter({
      search: "",
      navigate: () => undefined,
    }).subscribe(onChange);

    expect(onChange).not.toHaveBeenCalled();
    expect(() => {
      unsubscribe();
    }).not.toThrow();
  });

  it("reads the search it was built with, not one captured earlier", () => {
    // The caller rebuilds on navigation; this is what makes that work.
    const first = routerUrlAdapter({
      search: "page=1",
      navigate: () => undefined,
    });
    const second = routerUrlAdapter({
      search: "page=2",
      navigate: () => undefined,
    });

    expect(first.getSearch()).toBe("page=1");
    expect(second.getSearch()).toBe("page=2");
  });
});
