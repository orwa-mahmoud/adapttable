import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useInfiniteScroll } from "./useInfiniteScroll";

/** Captured observer instances so tests can drive intersection callbacks. */
interface FakeObserver {
  callback: IntersectionObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  options?: IntersectionObserverInit;
}

let observers: FakeObserver[] = [];
let originalIO: typeof IntersectionObserver | undefined;

function installFakeObserver() {
  originalIO = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = vi.fn().mockImplementation(function (
    this: unknown,
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    const instance: FakeObserver = {
      callback,
      observe: vi.fn(),
      disconnect: vi.fn(),
      options,
    };
    observers.push(instance);
    return instance;
  });
}

/** Fire an intersection event on the most recently created observer. */
function intersect(isIntersecting: boolean) {
  const observer = observers.at(-1);
  if (!observer) throw new Error("no observer was created");
  observer.callback(
    [{ isIntersecting } as IntersectionObserverEntry],
    observer as unknown as IntersectionObserver
  );
}

function Probe(props: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  enabled?: boolean;
  itemCount?: number;
}) {
  const ref = useInfiniteScroll<HTMLDivElement>(props);
  return <div ref={ref} data-testid="sentinel" />;
}

beforeEach(() => {
  observers = [];
  installFakeObserver();
});

afterEach(() => {
  if (originalIO) globalThis.IntersectionObserver = originalIO;
  else Reflect.deleteProperty(globalThis, "IntersectionObserver");
  vi.restoreAllMocks();
});

describe("useInfiniteScroll", () => {
  it("fetches the next page when the sentinel intersects", () => {
    const fetchNextPage = vi.fn();
    render(
      <Probe
        hasNextPage
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
      />
    );
    expect(observers).toHaveLength(1);
    intersect(true);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("does not fetch while a page is already in flight", () => {
    const fetchNextPage = vi.fn();
    render(
      <Probe hasNextPage isFetchingNextPage fetchNextPage={fetchNextPage} />
    );
    intersect(true);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("ignores non-intersecting events", () => {
    const fetchNextPage = vi.fn();
    render(
      <Probe
        hasNextPage
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
      />
    );
    intersect(false);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("never observes when there is no next page", () => {
    render(
      <Probe
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />
    );
    expect(observers).toHaveLength(0);
  });

  it("never observes when disabled", () => {
    render(
      <Probe
        hasNextPage
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
        enabled={false}
      />
    );
    expect(observers).toHaveLength(0);
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(
      <Probe hasNextPage isFetchingNextPage={false} fetchNextPage={vi.fn()} />
    );
    const observer = observers.at(-1);
    unmount();
    expect(observer?.disconnect).toHaveBeenCalledTimes(1);
  });

  it("no-ops when IntersectionObserver is unavailable", () => {
    Reflect.deleteProperty(globalThis, "IntersectionObserver");
    const fetchNextPage = vi.fn();
    expect(() =>
      render(
        <Probe
          hasNextPage
          isFetchingNextPage={false}
          fetchNextPage={fetchNextPage}
        />
      )
    ).not.toThrow();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("re-arms the observer when itemCount grows so short content keeps loading", () => {
    const fetchNextPage = vi.fn();
    const { rerender } = render(
      <Probe
        hasNextPage
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
        itemCount={1}
      />
    );
    expect(observers).toHaveLength(1);
    expect(observers[0]?.disconnect).not.toHaveBeenCalled();
    rerender(
      <Probe
        hasNextPage
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
        itemCount={2}
      />
    );
    // Old observer torn down, a fresh one armed against the grown content.
    expect(observers[0]?.disconnect).toHaveBeenCalledTimes(1);
    expect(observers).toHaveLength(2);
    intersect(true);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("calls the latest fetchNextPage without re-subscribing", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <Probe hasNextPage isFetchingNextPage={false} fetchNextPage={first} />
    );
    rerender(
      <Probe hasNextPage isFetchingNextPage={false} fetchNextPage={second} />
    );
    // Still a single observer — the closure swap must not re-create it.
    expect(observers).toHaveLength(1);
    intersect(true);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
