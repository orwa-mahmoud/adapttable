/**
 * One key, one layer — and only a layer that is actually there.
 */
import { fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { useEscapeClose } from "./useEscapeClose";

function Overlay({
  onClose,
  ignoreWithin,
  innerHidden = false,
  open = true,
}: {
  readonly onClose: () => void;
  readonly ignoreWithin?: string;
  readonly innerHidden?: boolean;
  readonly open?: boolean;
}) {
  useEscapeClose(open, onClose, ignoreWithin ? { ignoreWithin } : {});
  return (
    <div data-testid="overlay">
      <span
        className="inner"
        // A kit that keeps its editor mounted after closing it.
        style={innerHidden ? { display: "none" } : undefined}
      >
        <input data-testid="inner-input" />
      </span>
      <button data-testid="outer" type="button">
        outer
      </button>
    </div>
  );
}

describe("who answers Escape", () => {
  it("closes from anywhere while nothing inside claims the key", () => {
    const onClose = vi.fn();
    render(<Overlay onClose={onClose} />);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("leaves the key to a control inside that owns it", () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <Overlay onClose={onClose} ignoreWithin=".inner" />
    );
    fireEvent.keyDown(getByTestId("inner-input"), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("still closes for a key pressed outside that control", () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <Overlay onClose={onClose} ignoreWithin=".inner" />
    );
    fireEvent.keyDown(getByTestId("outer"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("takes the key back once that control is no longer on screen", () => {
    // The bug this pins: a kit that hides its editor rather than unmounting
    // it left focus inside the hidden thing, so every later Escape was eaten
    // by a control the reader had already dismissed — and the overlay around
    // it would not close.
    const onClose = vi.fn();
    const { getByTestId } = render(
      <Overlay onClose={onClose} ignoreWithin=".inner" innerHidden />
    );
    fireEvent.keyDown(getByTestId("inner-input"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("binds nothing while the overlay is closed", () => {
    const onClose = vi.fn();
    render(<Overlay onClose={onClose} open={false} />);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores every other key", () => {
    const onClose = vi.fn();
    render(<Overlay onClose={onClose} />);
    fireEvent.keyDown(document.body, { key: "Enter" });
    fireEvent.keyDown(document.body, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("stops listening once it closes", () => {
    const onClose = vi.fn();
    function Host() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <Overlay
            open={open}
            onClose={() => {
              onClose();
              setOpen(false);
            }}
          />
          <button type="button" onClick={() => setOpen(false)}>
            shut
          </button>
        </>
      );
    }
    render(<Host />);
    fireEvent.keyDown(document.body, { key: "Escape" });
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
