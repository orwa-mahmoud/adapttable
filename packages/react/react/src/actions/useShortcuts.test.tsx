/**
 * Shortcuts, including the cases that make a shortcut system usable rather
 * than merely present: one chord that is right on both platforms, a bare
 * key that does not fire while someone is typing, and a list the host can
 * replace outright.
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { type Shortcut, useShortcuts } from "./useShortcuts";

function Harness({
  enabled = true,
  shortcuts,
  onCommand,
}: Readonly<{
  enabled?: boolean;
  shortcuts?: readonly Shortcut[];
  onCommand: (command: string) => void;
}>) {
  useShortcuts({ enabled, shortcuts, onCommand });
  return (
    <div>
      <input data-testid="text" />
      <span data-testid="plain" />
    </div>
  );
}

const press = (init: Partial<KeyboardEventInit> & { key: string }) =>
  fireEvent.keyDown(document, init);

describe("useShortcuts", () => {
  it("opens the palette on the chord everyone already knows", () => {
    const onCommand = vi.fn();
    render(<Harness onCommand={onCommand} />);
    press({ key: "k", ctrlKey: true });

    expect(onCommand).toHaveBeenCalledWith("command-palette");
  });

  it("accepts either modifier, so one chord is right on both platforms", () => {
    const onCommand = vi.fn();
    render(<Harness onCommand={onCommand} />);
    press({ key: "k", metaKey: true });

    expect(onCommand).toHaveBeenCalledWith("command-palette");
  });

  it("ignores the key without its modifier", () => {
    const onCommand = vi.fn();
    render(<Harness onCommand={onCommand} />);
    press({ key: "k" });

    expect(onCommand).not.toHaveBeenCalled();
  });

  it("ignores a chord with an extra modifier held", () => {
    const onCommand = vi.fn();
    render(<Harness onCommand={onCommand} />);
    press({ key: "k", ctrlKey: true, shiftKey: true });

    expect(onCommand).not.toHaveBeenCalled();
  });

  it("takes the host's own list instead", () => {
    const onCommand = vi.fn();
    render(
      <Harness
        onCommand={onCommand}
        shortcuts={[{ chord: "ctrl+shift+p", command: "palette" }]}
      />
    );
    press({ key: "k", ctrlKey: true });

    expect(onCommand).not.toHaveBeenCalled();

    press({ key: "P", ctrlKey: true, shiftKey: true });

    expect(onCommand).toHaveBeenCalledWith("palette");
  });

  it("lets the host remove every shortcut", () => {
    const onCommand = vi.fn();
    render(<Harness onCommand={onCommand} shortcuts={[]} />);
    press({ key: "k", ctrlKey: true });

    expect(onCommand).not.toHaveBeenCalled();
  });

  it("keeps a bare key out of a text box", () => {
    const onCommand = vi.fn();
    const view = render(
      <Harness
        onCommand={onCommand}
        shortcuts={[{ chord: "?", command: "help" }]}
      />
    );
    fireEvent.keyDown(view.getByTestId("text"), { key: "?" });

    expect(onCommand).not.toHaveBeenCalled();

    fireEvent.keyDown(view.getByTestId("plain"), { key: "?" });

    expect(onCommand).toHaveBeenCalledWith("help");
  });

  it("still fires a chord inside a text box, which is what a modifier is for", () => {
    const onCommand = vi.fn();
    const view = render(<Harness onCommand={onCommand} />);
    fireEvent.keyDown(view.getByTestId("text"), { key: "k", ctrlKey: true });

    expect(onCommand).toHaveBeenCalledWith("command-palette");
  });

  it("binds nothing when it is not armed", () => {
    const onCommand = vi.fn();
    render(<Harness enabled={false} onCommand={onCommand} />);
    press({ key: "k", ctrlKey: true });

    expect(onCommand).not.toHaveBeenCalled();
  });

  it("unbinds when it unmounts", () => {
    const onCommand = vi.fn();
    const view = render(<Harness onCommand={onCommand} />);
    view.unmount();
    press({ key: "k", ctrlKey: true });

    expect(onCommand).not.toHaveBeenCalled();
  });
});
