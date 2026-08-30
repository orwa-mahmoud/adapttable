import { act, render, screen } from "@testing-library/react";
import { type ReactNode, useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type FeatureProviderProps,
  FeatureProviders,
  type FeatureStateKey,
  featureStateKey,
  FeatureStateScope,
  useFeatureState,
} from "./providers";
import { applyTableFeatures, type TableFeature } from "./tableFeature";

/** What `useTableFeatures` hands an adapter: props with the list remembered. */
const resolved = (features: readonly TableFeature[]) =>
  applyTableFeatures({ features });

const COUNTER = featureStateKey<number>("counter");
const LABEL = featureStateKey<string>("label");

/** A feature whose provider publishes a fixed value and records its lifecycle. */
function publishing<T>(
  id: string,
  stateKey: FeatureStateKey<T>,
  value: T,
  log?: string[]
): TableFeature {
  return {
    id,
    provider: {
      Provider: ({ children }: FeatureProviderProps) => {
        useEffect(() => {
          log?.push(`mount:${id}`);
          return () => {
            log?.push(`unmount:${id}`);
          };
        }, []);
        return (
          <FeatureStateScope stateKey={stateKey} value={value}>
            {children}
          </FeatureStateScope>
        );
      },
    },
  };
}

/** Renders whatever the two keys hold, so a test can read them from the DOM. */
function Readout() {
  const counter = useFeatureState(COUNTER);
  const label = useFeatureState(LABEL);
  return (
    <>
      <span data-testid="counter">{String(counter)}</span>
      <span data-testid="label">{String(label)}</span>
    </>
  );
}

function mount(features: readonly TableFeature[], children: ReactNode = null) {
  return render(
    <FeatureProviders props={resolved(features)}>
      {children ?? <Readout />}
    </FeatureProviders>
  );
}

describe("FeatureProviders", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("publishes what a provider scopes, and undefined for what nobody did", () => {
    mount([publishing("counter", COUNTER, 7)]);
    expect(screen.getByTestId("counter")).toHaveTextContent("7");
    expect(screen.getByTestId("label")).toHaveTextContent("undefined");
  });

  it("renders the table when no feature contributes a provider", () => {
    mount([{ id: "plain" }, { id: "also-plain", apply: () => ({}) }]);
    expect(screen.getByTestId("counter")).toHaveTextContent("undefined");
  });

  it("composes several providers at once", () => {
    mount([
      publishing("counter", COUNTER, 1),
      publishing("label", LABEL, "hi"),
    ]);
    expect(screen.getByTestId("counter")).toHaveTextContent("1");
    expect(screen.getByTestId("label")).toHaveTextContent("hi");
  });

  // The array order is the host's writing style, not a structural decision. If
  // it reached the tree, moving a line would remount a provider and discard
  // whatever it was holding — a lifted row, an open editor.
  it("nests in feature-id order, whatever order the array is written in", () => {
    const first: string[] = [];
    const { unmount } = mount([
      publishing("b-second", LABEL, "x", first),
      publishing("a-first", COUNTER, 1, first),
    ]);
    unmount();

    const second: string[] = [];
    mount([
      publishing("a-first", COUNTER, 1, second),
      publishing("b-second", LABEL, "x", second),
    ]).unmount();

    // Outermost mounts first: id order, not array order, both times.
    expect(first.slice(0, 2)).toEqual(["mount:b-second", "mount:a-first"]);
    expect(first.slice(0, 2)).toEqual(second.slice(0, 2));
  });

  it("does not remount a provider when the array is reordered", () => {
    const log: string[] = [];
    const a = publishing("a-first", COUNTER, 1, log);
    const b = publishing("b-second", LABEL, "x", log);

    function Host() {
      const [flipped, setFlipped] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setFlipped(true)}>
            flip
          </button>
          <FeatureProviders props={resolved(flipped ? [b, a] : [a, b])}>
            <Readout />
          </FeatureProviders>
        </>
      );
    }
    render(<Host />);
    expect(log).toEqual(["mount:b-second", "mount:a-first"]);

    act(() => screen.getByRole("button", { name: "flip" }).click());
    // Same two providers, same tree: nothing unmounted, nothing mounted again.
    expect(log).toEqual(["mount:b-second", "mount:a-first"]);
  });

  it("mounts a provider when its feature arrives and unmounts it when it goes", () => {
    const log: string[] = [];
    const a = publishing("a-first", COUNTER, 1, log);
    const b = publishing("b-second", LABEL, "x", log);

    function Host() {
      const [withB, setWithB] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setWithB((on) => !on)}>
            toggle
          </button>
          <FeatureProviders props={resolved(withB ? [a, b] : [a])}>
            <Readout />
          </FeatureProviders>
        </>
      );
    }
    render(<Host />);
    expect(screen.getByTestId("label")).toHaveTextContent("undefined");

    act(() => screen.getByRole("button", { name: "toggle" }).click());
    expect(screen.getByTestId("label")).toHaveTextContent("x");

    act(() => screen.getByRole("button", { name: "toggle" }).click());
    expect(screen.getByTestId("label")).toHaveTextContent("undefined");
    expect(log.filter((entry) => entry === "unmount:b-second")).toHaveLength(1);
  });

  it("disposes each provider exactly once on unmount", () => {
    const log: string[] = [];
    mount([
      publishing("a-first", COUNTER, 1, log),
      publishing("b-second", LABEL, "x", log),
    ]).unmount();
    expect(log.filter((entry) => entry.startsWith("unmount:"))).toEqual([
      "unmount:a-first",
      "unmount:b-second",
    ]);
  });

  it("warns once for a duplicate id and lets the last one win", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mount([
      publishing("counter", COUNTER, 1),
      publishing("counter", COUNTER, 2),
    ]);
    expect(screen.getByTestId("counter")).toHaveTextContent("2");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("counter");
  });

  // Two tables on one page, and a table inside another table's row detail, are
  // the same question: state must belong to the tree that provided it.
  it("keeps two tables' state apart", () => {
    render(
      <>
        <div data-testid="left">
          <FeatureProviders
            props={resolved([publishing("counter", COUNTER, 1)])}
          >
            <Readout />
          </FeatureProviders>
        </div>
        <div data-testid="right">
          <FeatureProviders
            props={resolved([publishing("counter", COUNTER, 2)])}
          >
            <Readout />
          </FeatureProviders>
        </div>
      </>
    );
    const left = screen.getByTestId("left");
    const right = screen.getByTestId("right");
    expect(left.querySelector('[data-testid="counter"]')).toHaveTextContent(
      "1"
    );
    expect(right.querySelector('[data-testid="counter"]')).toHaveTextContent(
      "2"
    );
  });

  it("lets a nested table shadow the outer table's value", () => {
    render(
      <FeatureProviders props={resolved([publishing("counter", COUNTER, 1)])}>
        <div data-testid="outer">
          <FeatureProviders
            props={resolved([publishing("counter", COUNTER, 2)])}
          >
            <div data-testid="inner">
              <Readout />
            </div>
          </FeatureProviders>
        </div>
      </FeatureProviders>
    );
    expect(
      screen.getByTestId("inner").querySelector('[data-testid="counter"]')
    ).toHaveTextContent("2");
  });

  it("keeps an outer feature readable from inside a nested table", () => {
    render(
      <FeatureProviders props={resolved([publishing("label", LABEL, "outer")])}>
        <FeatureProviders props={resolved([publishing("counter", COUNTER, 5)])}>
          <Readout />
        </FeatureProviders>
      </FeatureProviders>
    );
    expect(screen.getByTestId("label")).toHaveTextContent("outer");
    expect(screen.getByTestId("counter")).toHaveTextContent("5");
  });

  it("treats an absent feature list as no providers", () => {
    render(
      <FeatureProviders props={{}}>
        <Readout />
      </FeatureProviders>
    );
    expect(screen.getByTestId("counter")).toHaveTextContent("undefined");
  });
});
