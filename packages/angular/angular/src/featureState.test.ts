import { featureStateKey } from "@adapttable/core/binding";
import { computed, Injector } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import {
  ADAPTTABLE_FEATURE_STATE,
  createFeatureState,
  injectFeatureState,
} from "./featureState";

const COUNT = featureStateKey<number>("count");

describe("feature state", () => {
  it("keeps one typed signal per key and isolates tables", () => {
    const first = createFeatureState();
    const second = createFeatureState();
    const count = first.get(COUNT);
    expect(count()).toBeUndefined();
    first.set(COUNT, 4);
    expect(first.get(COUNT)).toBe(count);
    expect(first.get(featureStateKey<number>("count"))).toBe(count);
    expect(count()).toBe(4);
    expect(second.get(COUNT)()).toBeUndefined();
    first.set(COUNT, undefined);
    expect(count()).toBeUndefined();
    first.set(featureStateKey<string>("label"), "ready");
    expect(first.get(featureStateKey<string>("label"))()).toBe("ready");
  });

  it("invalidates computed readers when the same live handle is published again", () => {
    const key = featureStateKey<{ read(): string }>("stable-handle");
    const state = createFeatureState();
    let text = "before";
    const handle = { read: () => text };
    const read = state.get(key);
    const rendered = computed(() => read()?.read());
    state.set(key, handle);
    expect(rendered()).toBe("before");
    text = "after";
    expect(rendered()).toBe("before");
    state.set(key, handle);
    expect(read()).toBe(handle);
    expect(rendered()).toBe("after");
  });

  it("reads the state from its injection scope and is absent outside a table", () => {
    const state = createFeatureState();
    const injector = Injector.create({
      providers: [{ provide: ADAPTTABLE_FEATURE_STATE, useValue: state }],
      parent: TestBed.inject(Injector),
    });
    expect(injectFeatureState(COUNT, injector)).toBe(state.get(COUNT));
    expect(
      TestBed.runInInjectionContext(() => injectFeatureState(COUNT))()
    ).toBeUndefined();
    expect(
      injectFeatureState(COUNT, TestBed.inject(Injector))()
    ).toBeUndefined();
    injector.destroy();
  });
});
