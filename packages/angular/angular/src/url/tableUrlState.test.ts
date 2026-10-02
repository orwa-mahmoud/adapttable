/**
 * The table's URL state follows configuration given as signals.
 */
import { createMemoryAdapter, type UrlStateAdapter } from "@adapttable/core";
import {
  createEnvironmentInjector,
  EnvironmentInjector,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import {
  ADAPTTABLE_URL_ADAPTER,
  injectTableUrlState,
  urlAdapterFor,
} from "./tableUrlState";

describe("injectTableUrlState", () => {
  it("follows defaults given as a signal while the URL is silent, and yields to the URL", () => {
    const injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector)
    );
    const adapter = createMemoryAdapter();
    const defaults = signal({ limit: 10 });
    const url = injectTableUrlState({
      urlAdapter: adapter,
      defaults,
      injector,
    });
    expect(url.state().limit).toBe(10);
    defaults.set({ limit: 25 });
    expect(url.state().limit).toBe(25);
    url.setLimit(50);
    expect(url.state().limit).toBe(50);
    defaults.set({ limit: 5 });
    expect(url.state().limit).toBe(50);
    injector.destroy();
  });

  it("parses a filter key given later as a list", () => {
    const injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector)
    );
    const arrayExtraKeys = signal<readonly string[]>([]);
    const url = injectTableUrlState({
      urlAdapter: createMemoryAdapter("f_team=Core,Web"),
      arrayExtraKeys,
      injector,
    });
    expect(url.state().extra.team).toBe("Core,Web");
    arrayExtraKeys.set(["team"]);
    expect(url.state().extra.team).toEqual(["Core", "Web"]);
    injector.destroy();
  });

  it("switches between the live URL and retained private state without keeping an inactive subscription", () => {
    const injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector)
    );
    const adapter = createMemoryAdapter(
      "table.page=2&table.q=linked&other=kept"
    );
    const subscribe = adapter.subscribe;
    const released = vi.fn();
    const subscriptions = vi
      .spyOn(adapter, "subscribe")
      .mockImplementation((listener) => {
        const unsubscribe = subscribe(listener);
        return () => {
          released();
          unsubscribe();
        };
      });
    const syncing = signal(false);
    const url = injectTableUrlState({
      urlAdapter: adapter,
      urlKey: "table",
      urlSync: syncing,
      injector,
    });
    url.setSearch("private");
    url.setPage(3);
    expect(url.state()).toMatchObject({ search: "private", page: 3 });
    expect(subscriptions).not.toHaveBeenCalled();
    expect(adapter.getSearch()).toBe("table.page=2&table.q=linked&other=kept");

    syncing.set(true);
    expect(url.state()).toMatchObject({ search: "linked", page: 2 });
    expect(subscriptions).toHaveBeenCalledTimes(1);
    url.setPage(4);
    expect(new URLSearchParams(adapter.getSearch()).get("table.page")).toBe(
      "4"
    );
    expect(new URLSearchParams(adapter.getSearch()).get("other")).toBe("kept");

    syncing.set(false);
    expect(url.state()).toMatchObject({ search: "private", page: 3 });
    expect(released).toHaveBeenCalledTimes(1);
    adapter.setSearch("table.page=5&table.q=external&other=kept");
    expect(url.state()).toMatchObject({ search: "private", page: 3 });
    url.setPage(6);
    expect(new URLSearchParams(adapter.getSearch()).get("table.page")).toBe(
      "5"
    );

    syncing.set(true);
    expect(url.state()).toMatchObject({ search: "external", page: 5 });
    expect(subscriptions).toHaveBeenCalledTimes(2);
    adapter.setSearch("table.page=7&table.q=navigated&other=kept");
    expect(url.state()).toMatchObject({ search: "navigated", page: 7 });
    injector.destroy();
    expect(released).toHaveBeenCalledTimes(2);
  });

  it("switches live backends, retaining each store and subscribing only to the selected adapter", () => {
    const injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector)
    );
    const first = createMemoryAdapter("table.q=first&table.page=2&other=kept");
    const second = createMemoryAdapter("table.q=second&table.page=3");
    const firstSubscribe = first.subscribe;
    const secondSubscribe = second.subscribe;
    const releaseFirst = vi.fn();
    const releaseSecond = vi.fn();
    const firstSubscriptions = vi
      .spyOn(first, "subscribe")
      .mockImplementation((listener) => {
        const unsubscribe = firstSubscribe(listener);
        return () => {
          releaseFirst();
          unsubscribe();
        };
      });
    const secondSubscriptions = vi
      .spyOn(second, "subscribe")
      .mockImplementation((listener) => {
        const unsubscribe = secondSubscribe(listener);
        return () => {
          releaseSecond();
          unsubscribe();
        };
      });
    const adapter = signal(first);
    const url = injectTableUrlState({
      urlAdapter: adapter,
      urlKey: "table",
      injector,
    });
    const initial = url.state();
    expect(initial).toMatchObject({ search: "first", page: 2 });
    expect(firstSubscriptions).toHaveBeenCalledTimes(1);
    expect(secondSubscriptions).not.toHaveBeenCalled();

    adapter.set(second);
    expect(url.state()).toMatchObject({ search: "second", page: 3 });
    expect(releaseFirst).toHaveBeenCalledTimes(1);
    expect(secondSubscriptions).toHaveBeenCalledTimes(1);
    url.setPage(4);
    expect(new URLSearchParams(second.getSearch()).get("table.page")).toBe("4");
    expect(first.getSearch()).toBe("table.q=first&table.page=2&other=kept");

    adapter.set(first);
    expect(url.state()).toBe(initial);
    expect(releaseSecond).toHaveBeenCalledTimes(1);
    expect(firstSubscriptions).toHaveBeenCalledTimes(2);
    adapter.set(second);
    const active = url.state();
    first.setSearch("table.q=external&table.page=5&other=kept");
    expect(url.state()).toBe(active);
    expect(url.state()).toMatchObject({ search: "second", page: 4 });

    adapter.set(first);
    expect(url.state()).toMatchObject({ search: "external", page: 5 });
    expect(firstSubscriptions).toHaveBeenCalledTimes(3);
    expect(secondSubscriptions).toHaveBeenCalledTimes(2);
    expect(releaseFirst).toHaveBeenCalledTimes(2);
    expect(releaseSecond).toHaveBeenCalledTimes(2);
    injector.destroy();
    expect(releaseFirst).toHaveBeenCalledTimes(3);
    expect(releaseSecond).toHaveBeenCalledTimes(2);
  });

  it("switches namespaces without overwriting other prefixes or rebuilding an unchanged store", () => {
    const injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector)
    );
    const adapter = createMemoryAdapter(
      "q=bare&left.q=left&left.page=2&right.q=right&right.page=3&other=kept"
    );
    const key = signal<string | undefined>("left");
    const url = injectTableUrlState({
      urlAdapter: adapter,
      urlKey: key,
      injector,
    });
    const initial = url.state();
    expect(initial).toMatchObject({ search: "left", page: 2 });
    key.set("right");
    expect(url.state()).toMatchObject({ search: "right", page: 3 });
    key.set("left");
    expect(url.state()).toBe(initial);

    key.set("right");
    url.setSearch("updated");
    url.setPage(4);
    expect(
      Object.fromEntries(new URLSearchParams(adapter.getSearch()))
    ).toEqual({
      q: "bare",
      "left.q": "left",
      "left.page": "2",
      "right.q": "updated",
      "right.page": "4",
      "right.atv": "1",
      other: "kept",
    });
    key.set(undefined);
    const bare = url.state();
    expect(bare).toMatchObject({ search: "bare", page: 1 });
    key.set("");
    expect(url.state()).toBe(bare);
    url.setSearch("bare updated");
    key.set("left");
    expect(url.state()).toMatchObject({ search: "left", page: 2 });
    key.set("right");
    expect(url.state()).toMatchObject({ search: "updated", page: 4 });
    expect(new URLSearchParams(adapter.getSearch()).get("q")).toBe(
      "bare updated"
    );
    expect(new URLSearchParams(adapter.getSearch()).get("other")).toBe("kept");
    injector.destroy();
  });

  it("returns to the injector's backend when an optional adapter signal is cleared", () => {
    const provided = createMemoryAdapter("q=provided");
    const explicit = createMemoryAdapter("q=explicit");
    const injector = createEnvironmentInjector(
      [{ provide: ADAPTTABLE_URL_ADAPTER, useValue: provided }],
      TestBed.inject(EnvironmentInjector)
    );
    const adapter = signal<UrlStateAdapter | undefined>(undefined);
    const url = injectTableUrlState({ urlAdapter: adapter, injector });
    const initial = url.state();
    expect(initial.search).toBe("provided");
    expect(urlAdapterFor({ urlAdapter: adapter }, injector)).toBe(provided);
    adapter.set(explicit);
    expect(url.state().search).toBe("explicit");
    expect(urlAdapterFor({ urlAdapter: adapter }, injector)).toBe(explicit);
    adapter.set(undefined);
    expect(url.state()).toBe(initial);
    expect(urlAdapterFor({ urlAdapter: adapter }, injector)).toBe(provided);
    injector.destroy();
  });

  it("releases old namespace claims before swapping owners and warns for a real duplicate", async () => {
    const injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector)
    );
    const adapter = createMemoryAdapter();
    const firstKey = signal("left");
    const secondKey = signal("right");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const first = injectTableUrlState({
      urlAdapter: adapter,
      urlKey: firstKey,
      injector,
    });
    const second = injectTableUrlState({
      urlAdapter: adapter,
      urlKey: secondKey,
      injector,
    });
    TestBed.tick();
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();

    firstKey.set("right");
    secondKey.set("left");
    first.setPage(2);
    second.setPage(3);
    TestBed.tick();
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();
    expect(new URLSearchParams(adapter.getSearch()).get("right.page")).toBe(
      "2"
    );
    expect(new URLSearchParams(adapter.getSearch()).get("left.page")).toBe("3");

    const duplicateInjector = createEnvironmentInjector([], injector);
    injectTableUrlState({
      urlAdapter: signal(adapter),
      urlKey: signal("right"),
      injector: duplicateInjector,
    });
    TestBed.tick();
    await Promise.resolve();
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('two tables share the URL namespace "right."')
    );
    duplicateInjector.destroy();
    injector.destroy();

    const replacementInjector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector)
    );
    injectTableUrlState({
      urlAdapter: adapter,
      urlKey: "right",
      injector: replacementInjector,
    });
    TestBed.tick();
    await Promise.resolve();
    expect(warn).toHaveBeenCalledTimes(1);
    replacementInjector.destroy();
  });

  it("releases old adapter claims before swapping backends and cancels pending claims on destroy", async () => {
    const injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector)
    );
    const firstAdapter = createMemoryAdapter();
    const secondAdapter = createMemoryAdapter();
    const firstBackend = signal(firstAdapter);
    const secondBackend = signal(secondAdapter);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const first = injectTableUrlState({
      urlAdapter: firstBackend,
      urlKey: "table",
      injector,
    });
    const second = injectTableUrlState({
      urlAdapter: secondBackend,
      urlKey: "table",
      injector,
    });
    TestBed.tick();
    await Promise.resolve();
    firstBackend.set(secondAdapter);
    secondBackend.set(firstAdapter);
    first.state();
    second.state();
    TestBed.tick();
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();

    firstBackend.set(firstAdapter);
    secondBackend.set(secondAdapter);
    TestBed.tick();
    // The new claims are queued, but the owner is destroyed before they run.
    injector.destroy();
    await Promise.resolve();
    const replacementInjector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector)
    );
    injectTableUrlState({
      urlAdapter: firstAdapter,
      urlKey: "table",
      injector: replacementInjector,
    });
    injectTableUrlState({
      urlAdapter: secondAdapter,
      urlKey: "table",
      injector: replacementInjector,
    });
    TestBed.tick();
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();
    replacementInjector.destroy();
  });

  it("releases an inactive namespace claim while still warning about two active owners", async () => {
    const injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector)
    );
    const adapter = createMemoryAdapter();
    const firstSync = signal(true);
    const secondSync = signal(false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const first = injectTableUrlState({
      urlAdapter: adapter,
      urlKey: "switching-tiers",
      urlSync: firstSync,
      injector,
    });
    const second = injectTableUrlState({
      urlAdapter: adapter,
      urlKey: "switching-tiers",
      urlSync: secondSync,
      injector,
    });
    TestBed.tick();
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();

    firstSync.set(false);
    secondSync.set(true);
    // Reading the new owner first must not report a transient duplicate.
    second.setPage(2);
    first.state();
    TestBed.tick();
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();
    expect(
      new URLSearchParams(adapter.getSearch()).get("switching-tiers.page")
    ).toBe("2");

    injector.destroy();

    const replacementInjector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector)
    );
    injectTableUrlState({
      urlAdapter: adapter,
      urlKey: "switching-tiers",
      injector: replacementInjector,
    });
    TestBed.tick();
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();
    injectTableUrlState({
      urlAdapter: adapter,
      urlKey: "switching-tiers",
      injector: replacementInjector,
    });
    TestBed.tick();
    await Promise.resolve();
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining(
        'two tables share the URL namespace "switching-tiers."'
      )
    );
    replacementInjector.destroy();
  });
});
