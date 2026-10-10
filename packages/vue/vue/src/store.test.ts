import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  isProxy,
  isReadonly,
  KeepAlive,
  nextTick,
  type ShallowRef,
  shallowRef,
  watch,
} from "vue";

import {
  type ExternalStore,
  useExternalStore,
  useScopeActivity,
} from "./store";

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  const history: (() => void)[] = [];
  const subscribe = vi.fn((listener: () => void) => {
    listeners.add(listener);
    history.push(listener);
    return vi.fn(() => {
      listeners.delete(listener);
    });
  });
  return {
    getSnapshot: () => value,
    subscribe,
    listeners,
    history,
    set(next: T) {
      value = next;
      for (const listener of listeners) listener();
    },
  };
}

describe("useExternalStore", () => {
  it("requires a resource owner", () => {
    expect(() => useExternalStore(createStore(1))).toThrow("effectScope");
    expect(() => useScopeActivity()).toThrow("effectScope");
  });

  it("rereads the snapshot after subscription closes a missed update window", () => {
    const scope = effectScope();
    let value = 1;
    const store: ExternalStore<number> = {
      getSnapshot: () => value,
      subscribe: () => {
        value = 2;
        return () => undefined;
      },
    };
    const state = scope.run(() => useExternalStore(store));
    expect(state?.value).toBe(2);
    scope.stop();
  });

  it("preserves raw snapshot identity and suppresses redundant publication", () => {
    const scope = effectScope();
    const row = { id: "one" };
    const store = createStore({ rows: [row] });
    const state = scope.run(() => useExternalStore(store));
    if (!state) throw new Error("missing state");
    const updates = vi.fn();
    scope.run(() => watch(state, updates, { flush: "sync" }));
    expect(isReadonly(state)).toBe(true);
    expect(isProxy(state.value)).toBe(false);
    expect(state.value.rows[0]).toBe(row);
    store.set(store.getSnapshot());
    expect(updates).not.toHaveBeenCalled();
    const next = { rows: [row] };
    store.set(next);
    expect(state.value).toBe(next);
    expect(updates).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it("unsubscribes old stores first and refuses delayed old notifications", () => {
    const scope = effectScope();
    const events: string[] = [];
    const first = createStore("first");
    const second = createStore("second");
    const input = shallowRef<ExternalStore<string>>({
      getSnapshot: first.getSnapshot,
      subscribe: (listener) => {
        events.push("first subscribe");
        const stop = first.subscribe(listener);
        return () => {
          events.push("first stop");
          stop();
        };
      },
    });
    const state = scope.run(() => useExternalStore(input));
    input.value = {
      getSnapshot: second.getSnapshot,
      subscribe: (listener) => {
        events.push("second subscribe");
        return second.subscribe(listener);
      },
    };
    first.set("late");
    first.history[0]?.();
    expect(state?.value).toBe("second");
    expect(events).toEqual([
      "first subscribe",
      "first stop",
      "second subscribe",
    ]);
    scope.stop();
    scope.stop();
    expect(first.subscribe.mock.results[0]?.value).toHaveBeenCalledTimes(1);
    expect(second.subscribe.mock.results[0]?.value).toHaveBeenCalledTimes(1);
    second.set("after disposal");
    expect(state?.value).toBe("second");
  });

  it("releases subscriptions returned after reentrant store replacement", () => {
    const scope = effectScope();
    const events: string[] = [];
    const stop = vi.fn(() => {
      events.push("old stop");
    });
    const next = {
      getSnapshot: () => "replacement",
      subscribe: () => {
        events.push("new subscribe");
        return () => undefined;
      },
    };
    const input = shallowRef<ExternalStore<string>>(next);
    input.value = {
      getSnapshot: () => "old",
      subscribe: () => {
        input.value = next;
        return stop;
      },
    };
    const state = scope.run(() => useExternalStore(input));
    expect(state?.value).toBe("replacement");
    expect(events).toEqual(["old stop", "new subscribe"]);
    expect(stop).toHaveBeenCalledTimes(1);
    scope.stop();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("releases a subscription returned after scope disposal during subscribe", () => {
    const scope = effectScope();
    const stop = vi.fn();
    scope.run(() =>
      useExternalStore({
        getSnapshot: () => 1,
        subscribe: () => {
          scope.stop();
          return stop;
        },
      })
    );
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("does not publish a snapshot whose read replaced the store", () => {
    const scope = effectScope();
    const next = createStore("next");
    const input = shallowRef<ExternalStore<string>>(next);
    let replace = false;
    let notify: () => void = () => undefined;
    input.value = {
      getSnapshot: () => {
        if (replace) input.value = next;
        return "old";
      },
      subscribe: (listener) => {
        notify = listener;
        return () => undefined;
      },
    };
    const state = scope.run(() => useExternalStore(input));
    replace = true;
    notify();
    expect(state?.value).toBe("next");
    scope.stop();
  });

  it("cleans an attached subscription if the race-closing read throws", () => {
    const scope = effectScope();
    const failure = new Error("read failed");
    const stop = vi.fn();
    let subscribed = false;
    expect(() =>
      scope.run(() =>
        useExternalStore({
          getSnapshot: () => {
            if (subscribed) throw failure;
            return 1;
          },
          subscribe: () => {
            subscribed = true;
            return stop;
          },
        })
      )
    ).toThrow(failure);
    expect(stop).toHaveBeenCalledTimes(1);
    scope.stop();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("preserves both read and cleanup failures", () => {
    const scope = effectScope();
    const failure = new Error("read failed");
    const cleanupFailure = new Error("cleanup failed");
    let subscribed = false;
    let error: unknown;
    try {
      scope.run(() =>
        useExternalStore({
          getSnapshot: () => {
            if (subscribed) throw failure;
            return 1;
          },
          subscribe: () => {
            subscribed = true;
            return () => {
              throw cleanupFailure;
            };
          },
        })
      );
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(AggregateError);
    if (!(error instanceof AggregateError))
      throw new Error("expected aggregate error");
    expect(error.errors).toEqual([failure, cleanupFailure]);
    scope.stop();
  });

  it("propagates setup reads and subscriptions that fail before acquiring a handle", () => {
    const scope = effectScope();
    const failure = new Error("setup failed");
    const subscribe = vi.fn(() => () => undefined);
    expect(() =>
      scope.run(() =>
        useExternalStore({
          getSnapshot: () => {
            throw failure;
          },
          subscribe,
        })
      )
    ).toThrow(failure);
    expect(subscribe).not.toHaveBeenCalled();
    expect(() =>
      scope.run(() =>
        useExternalStore({
          getSnapshot: () => 1,
          subscribe: () => {
            throw failure;
          },
        })
      )
    ).toThrow(failure);
    scope.stop();
  });

  it("suspends KeepAlive resources and catches up before resubscribing", async () => {
    const store = createStore(1);
    const visible = shallowRef(true);
    let state: Readonly<ShallowRef<number>> | undefined;
    const Child = defineComponent({
      setup() {
        state = useExternalStore(store);
        return () => h("span", state?.value);
      },
    });
    const app = createApp({
      setup: () => () =>
        h(KeepAlive, null, {
          default: () => (visible.value ? h(Child) : null),
        }),
    });
    const root = document.createElement("div");
    app.mount(root);
    expect(store.listeners.size).toBe(1);
    visible.value = false;
    await nextTick();
    expect(store.listeners.size).toBe(0);
    store.set(7);
    expect(state?.value).toBe(1);
    visible.value = true;
    await nextTick();
    expect(store.listeners.size).toBe(1);
    expect(root.textContent).toBe("7");
    app.unmount();
    expect(store.listeners.size).toBe(0);
  });
});
