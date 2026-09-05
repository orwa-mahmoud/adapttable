/**
 * The measured width, and the distinction that matters: "not measured yet"
 * is not "measured as zero".
 */
import { render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useElementWidth } from "./useElementWidth";

let observers: { callback: () => void; disconnect: () => void }[] = [];

function stubResizeObserver() {
  observers = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private readonly callback: () => void) {
        observers.push({
          callback: () => {
            this.callback();
          },
          disconnect: () => undefined,
        });
      }
      observe() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    }
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function Probe({ width }: Readonly<{ width: number }>) {
  const ref = createRef<HTMLDivElement>();
  return <Measured elementRef={ref} width={width} />;
}

function Measured({
  elementRef,
  width,
}: Readonly<{
  elementRef: React.RefObject<HTMLDivElement | null>;
  width: number;
}>) {
  const measured = useElementWidth(elementRef);
  return (
    <div
      ref={(node) => {
        if (node) Object.defineProperty(node, "clientWidth", { value: width });
        elementRef.current = node;
      }}
      data-testid="probe"
    >
      {measured === undefined ? "unmeasured" : String(measured)}
    </div>
  );
}

describe("useElementWidth", () => {
  it("reports the element's width once it has been measured", () => {
    stubResizeObserver();
    const view = render(<Probe width={640} />);

    expect(view.getByTestId("probe")).toHaveTextContent("640");
  });

  it("stays unmeasured where there is no ResizeObserver", () => {
    // The server, and any environment without one. Reporting 0 here would
    // make every table render its narrowest layout before hydration.
    vi.stubGlobal("ResizeObserver", undefined);
    const view = render(<Probe width={640} />);

    expect(view.getByTestId("probe")).toHaveTextContent("unmeasured");
  });

  it("re-measures when the observer fires", () => {
    stubResizeObserver();
    const view = render(<Probe width={300} />);

    expect(view.getByTestId("probe")).toHaveTextContent("300");
    expect(observers.length).toBeGreaterThan(0);
  });
});
