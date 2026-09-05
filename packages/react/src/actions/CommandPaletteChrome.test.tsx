/**
 * The palette's keyboard contract.
 *
 * Everything here is invisible until someone uses a keyboard. Focus lands
 * in the input, the arrows move a highlight without taking the caret, the
 * highlight survives typing, Tab cannot escape the modal, and closing puts
 * focus back where it was. A palette that gets any one of these wrong looks
 * completely fine in a screenshot.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  CommandPaletteChrome,
  type CommandPaletteSlots,
} from "./CommandPaletteChrome";

const slots: CommandPaletteSlots = {
  Surface: ({ label, children, className }) => (
    <div role="dialog" aria-label={label} className={className}>
      {children}
    </div>
  ),
  Input: ({ inputProps }) => {
    const { onChange, ...rest } = inputProps;
    return (
      <input
        {...rest}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    );
  },
  Item: ({ command, itemProps }) => <div {...itemProps}>{command.label}</div>,
  Empty: ({ message }) => <p data-testid="empty">{message}</p>,
};

const run = { print: vi.fn(), export: vi.fn(), locked: vi.fn() };
const COMMANDS = [
  { key: "print", label: "Print", onSelect: run.print },
  { key: "export", label: "Export CSV", onSelect: run.export },
  { key: "locked", label: "Résumé sync", disabled: true, onSelect: run.locked },
];

function setup(
  overrides?: Partial<Parameters<typeof CommandPaletteChrome>[0]>
) {
  const onClose = vi.fn();
  const view = render(
    <>
      <button type="button" data-testid="opener">
        open
      </button>
      <CommandPaletteChrome
        commands={COMMANDS}
        open
        onClose={onClose}
        slots={slots}
        {...overrides}
      />
    </>
  );
  return { onClose, view };
}

const input = () => screen.getByRole("combobox");
const options = () => screen.getAllByRole("option");
const activeOption = () =>
  options().find((el) => el.getAttribute("aria-selected") === "true");

describe("CommandPaletteChrome", () => {
  it("renders nothing when closed", () => {
    setup({ open: false });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("takes focus into the input on open", () => {
    setup();

    expect(document.activeElement).toBe(input());
  });

  it("lists every command, with the first one highlighted", () => {
    setup();

    expect(options()).toHaveLength(3);
    expect(activeOption()).toHaveTextContent("Print");
  });

  it("points the input at the highlighted option for screen readers", () => {
    setup();

    expect(input()).toHaveAttribute(
      "aria-activedescendant",
      activeOption()?.id
    );
  });

  it("moves the highlight with the arrows, wrapping, without moving focus", () => {
    setup();
    fireEvent.keyDown(input(), { key: "ArrowDown" });

    expect(activeOption()).toHaveTextContent("Export CSV");
    // The caret must stay in the input, or typing after arrowing is lost.
    expect(document.activeElement).toBe(input());

    fireEvent.keyDown(input(), { key: "ArrowUp" });
    fireEvent.keyDown(input(), { key: "ArrowUp" });

    expect(activeOption()).toHaveTextContent("Résumé sync");
  });

  it("jumps to the ends with Home and End", () => {
    setup();
    fireEvent.keyDown(input(), { key: "End" });

    expect(activeOption()).toHaveTextContent("Résumé sync");

    fireEvent.keyDown(input(), { key: "Home" });

    expect(activeOption()).toHaveTextContent("Print");
  });

  it("filters as you type, and finds an accented label unaccented", () => {
    setup();
    fireEvent.change(input(), { target: { value: "resume" } });

    expect(options()).toHaveLength(1);
    expect(options()[0]).toHaveTextContent("Résumé sync");
  });

  it("says so when nothing matches", () => {
    setup();
    fireEvent.change(input(), { target: { value: "zzz" } });

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByTestId("empty")).toHaveTextContent(
      "No matching command"
    );
  });

  it("runs the highlighted command on Enter, closing first", () => {
    const order: string[] = [];
    const onClose = vi.fn(() => order.push("close"));
    render(
      <CommandPaletteChrome
        commands={[
          { key: "go", label: "Go", onSelect: () => order.push("run") },
        ]}
        open
        onClose={onClose}
        slots={slots}
      />
    );
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });

    expect(order).toEqual(["close", "run"]);
  });

  it("runs a command that is clicked", () => {
    run.export.mockClear();
    setup();
    fireEvent.click(screen.getByText("Export CSV"));

    expect(run.export).toHaveBeenCalledTimes(1);
  });

  it("refuses to run a disabled command", () => {
    run.locked.mockClear();
    const { onClose } = setup();
    fireEvent.keyDown(input(), { key: "End" });
    fireEvent.keyDown(input(), { key: "Enter" });

    expect(run.locked).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("moves the highlight to whatever the pointer is over", () => {
    setup();
    fireEvent.mouseEnter(screen.getByText("Export CSV"));

    // The pointer and the arrows drive the same highlight, or the two
    // disagree the moment someone uses both.
    expect(activeOption()).toHaveTextContent("Export CSV");
  });

  it("closes on Escape", () => {
    const { onClose } = setup();
    fireEvent.keyDown(input(), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps Tab inside the modal", () => {
    setup();
    // One focusable inside, so Tab from it must come back to it rather
    // than reaching the opener button behind the palette.
    fireEvent.keyDown(input(), { key: "Tab" });

    expect(document.activeElement).toBe(input());
  });

  it("puts focus back where it came from when it closes", () => {
    const { view } = setup({ open: false });
    act(() => screen.getByTestId("opener").focus());
    view.rerender(
      <>
        <button type="button" data-testid="opener">
          open
        </button>
        <CommandPaletteChrome
          commands={COMMANDS}
          open
          onClose={vi.fn()}
          slots={slots}
        />
      </>
    );

    expect(document.activeElement).toBe(screen.getByRole("combobox"));

    view.rerender(
      <>
        <button type="button" data-testid="opener">
          open
        </button>
        <CommandPaletteChrome
          commands={COMMANDS}
          open={false}
          onClose={vi.fn()}
          slots={slots}
        />
      </>
    );

    expect(document.activeElement).toBe(screen.getByTestId("opener"));
  });
});
