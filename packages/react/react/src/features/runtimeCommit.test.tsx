import { act, render } from "@testing-library/react";
import { type ReactNode, Suspense, use } from "react";
import { describe, expect, it } from "vitest";

import {
  FeatureProviders,
  PublishTableRuntime,
  type TableRuntime,
  usePublishTableRuntime,
  useTableRuntime,
} from "./providers";
import { applyTableFeatures } from "./tableFeature";

const PROPS = applyTableFeatures({ features: [] });

function pending(): { wait: Promise<void>; resume: () => void } {
  let resume = (): void => undefined;
  const wait = new Promise<void>((resolve) => {
    resume = resolve;
  });
  return { wait, resume };
}

/** Suspends until `wait` settles. */
function Gate({ wait }: { readonly wait: Promise<void> | undefined }): null {
  if (wait) use(wait);
  return null;
}

/** A chrome that publishes on its own, with nothing above it. */
function Standalone({
  rows,
  wait,
}: {
  readonly rows: readonly string[];
  readonly wait?: Promise<void>;
}): ReactNode {
  usePublishTableRuntime({ rows: () => rows, labels: () => undefined });
  return <Gate wait={wait} />;
}

/** A layer over the chrome's reader, as the live gate builds one. */
function Layer({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactNode {
  usePublishTableRuntime({
    rows: () => [],
    labels: () => ({ layer: label }),
  });
  return children;
}

function Table({
  rows,
  wait,
}: {
  readonly rows: readonly string[];
  readonly wait?: Promise<void>;
}): ReactNode {
  return (
    <PublishTableRuntime
      reader={{ rows: () => rows, labels: () => ({ base: rows[0] }) }}
    >
      <Layer label={rows[0] ?? ""}>
        <Gate wait={wait} />
      </Layer>
    </PublishTableRuntime>
  );
}

describe("the published table runtime", () => {
  it("keeps callbacks on the last committed table when a lone publisher's render is abandoned", async () => {
    let runtime: TableRuntime | undefined;
    function Capture(): null {
      runtime = useTableRuntime();
      return null;
    }
    const tree = (rows: readonly string[], wait?: Promise<void>) => (
      <FeatureProviders props={PROPS}>
        <Capture />
        <Suspense fallback={null}>
          <Standalone rows={rows} wait={wait} />
        </Suspense>
      </FeatureProviders>
    );
    const view = render(tree(["a"]));
    expect(runtime?.rowAt(0)).toBe("a");
    const { wait, resume } = pending();
    await act(async () => {
      view.rerender(tree(["b"], wait));
      await Promise.resolve();
    });
    expect(runtime?.rowAt(0)).toBe("a");
    await act(async () => {
      resume();
      await wait;
    });
    expect(runtime?.rowAt(0)).toBe("b");
    view.unmount();
  });

  it("keeps callbacks on the last committed table while a render is abandoned", async () => {
    let runtime: TableRuntime | undefined;
    function Capture(): null {
      runtime = useTableRuntime();
      return null;
    }
    const tree = (rows: readonly string[], wait?: Promise<void>) => (
      <FeatureProviders props={PROPS}>
        <Capture />
        <Suspense fallback={null}>
          <Table rows={rows} wait={wait} />
        </Suspense>
      </FeatureProviders>
    );
    const view = render(tree(["a"]));
    expect(runtime?.labels()).toEqual({ layer: "a" });

    const { wait, resume } = pending();
    await act(async () => {
      view.rerender(tree(["b"], wait));
      await Promise.resolve();
    });
    // The render that met "b" suspended and was thrown away: a handler still
    // reads the table the reader last saw committed.
    expect(runtime?.labels()).toEqual({ layer: "a" });

    await act(async () => {
      resume();
      await wait;
    });
    expect(runtime?.labels()).toEqual({ layer: "b" });
    view.unmount();
  });

  it("publishes the base reader when no layer builds on it", () => {
    let runtime: TableRuntime | undefined;
    function Capture(): null {
      runtime = useTableRuntime();
      return null;
    }
    render(
      <FeatureProviders props={PROPS}>
        <Capture />
        <PublishTableRuntime
          reader={{ rows: () => ["x"], labels: () => ({ base: "x" }) }}
        >
          {null}
        </PublishTableRuntime>
      </FeatureProviders>
    );
    expect(runtime?.rowAt(0)).toBe("x");
    expect(runtime?.labels()).toEqual({ base: "x" });
  });
});
