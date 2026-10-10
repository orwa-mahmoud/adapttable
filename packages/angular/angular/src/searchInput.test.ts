import { Injector, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { createSearchInput } from "./searchInput";

function setup(initial = "") {
  const injector = Injector.create({
    providers: [],
    parent: TestBed.inject(Injector),
  }) as Injector & { destroy: () => void };
  const committed = signal(initial);
  const setSearch = vi.fn((term: string) => {
    committed.set(term);
  });
  const input = createSearchInput(committed, setSearch, 300, injector);
  const flush = () => {
    TestBed.tick();
  };
  return { injector, committed, setSearch, input, flush };
}

describe("createSearchInput", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts from the committed term", () => {
    expect(setup("ada").input.value()).toBe("ada");
  });

  it("commits the trimmed text once typing pauses", () => {
    const { input, setSearch } = setup();
    input.setValue("a");
    vi.advanceTimersByTime(200);
    input.setValue(" ad ");
    vi.advanceTimersByTime(299);
    expect(setSearch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(setSearch).toHaveBeenCalledExactlyOnceWith("ad");
    expect(input.value()).toBe(" ad ");
  });

  it("does not commit the term already committed", () => {
    const { input, setSearch } = setup("ad");
    input.setValue("ad ");
    vi.advanceTimersByTime(300);
    expect(setSearch).not.toHaveBeenCalled();
  });

  it("keeps typing over its own commit coming back", () => {
    const { input, flush } = setup();
    input.setValue("ad");
    vi.advanceTimersByTime(300);
    input.setValue("ada");
    flush();
    expect(input.value()).toBe("ada");
  });

  it("takes an outside change and drops the pending commit", () => {
    const { input, committed, setSearch, flush } = setup("ad");
    input.setValue("adx");
    committed.set("");
    flush();
    expect(input.value()).toBe("");
    vi.advanceTimersByTime(300);
    expect(setSearch).not.toHaveBeenCalled();
  });

  it("commits at once, trimmed, on request", () => {
    const { input, setSearch } = setup();
    input.setValue("typed");
    input.commit("  now ");
    expect(setSearch).toHaveBeenCalledExactlyOnceWith("now");
    expect(input.value()).toBe("now");
    input.commit("now");
    vi.advanceTimersByTime(300);
    expect(setSearch).toHaveBeenCalledTimes(1);
  });

  it("drops a pending commit when its injector is destroyed", () => {
    const { input, injector, setSearch } = setup();
    input.setValue("late");
    injector.destroy();
    vi.advanceTimersByTime(300);
    expect(setSearch).not.toHaveBeenCalled();
  });

  it("commits a pending term when the box loses focus, so a saved view can restore its own", () => {
    const { input, committed, setSearch, flush } = setup("Priya");
    const box = document.createElement("input");
    document.body.append(box);
    box.focus();
    // Clear the box, then reach for a saved view before the delay ends.
    input.setValue("");
    box.blur();
    expect(setSearch).toHaveBeenCalledExactlyOnceWith("");
    // The view brings back the term the box held before.
    committed.set("Priya");
    flush();
    expect(input.value()).toBe("Priya");
    vi.advanceTimersByTime(300);
    expect(setSearch).toHaveBeenCalledTimes(1);
    box.remove();
  });

  it("does not commit on blur once the delay has committed the term", () => {
    const { input, setSearch } = setup();
    const box = document.createElement("input");
    document.body.append(box);
    box.focus();
    input.setValue("ada");
    vi.advanceTimersByTime(300);
    box.blur();
    expect(setSearch).toHaveBeenCalledExactlyOnceWith("ada");
    box.remove();
  });
});
