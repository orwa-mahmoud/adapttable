/**
 * The palette, assembled.
 *
 * The failure this guards against is quiet: a palette whose shortcut was
 * never bound simply never appears, and nothing on screen is missing.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { defaultLabels } from "@adapttable/core";
import {
  type CommandPaletteOptions,
  useCommandPalette,
} from "./useCommandPalette";

const onPrint = vi.fn();

function Harness({ commandPalette = true as boolean | CommandPaletteOptions }) {
  const palette = useCommandPalette({
    commandPalette,
    labels: defaultLabels,
    onPrint,
  });
  return (
    <div>
      <button type="button" data-testid="open" onClick={palette.show}>
        open
      </button>
      <output data-testid="state">{palette.open ? "open" : "closed"}</output>
      <output data-testid="commands">
        {palette.commands.map((c) => c.key).join(",")}
      </output>
    </div>
  );
}

const state = () => screen.getByTestId("state").textContent;
const commands = () => screen.getByTestId("commands").textContent;

describe("useCommandPalette", () => {
  it("starts closed", () => {
    render(<Harness />);

    expect(state()).toBe("closed");
  });

  it("opens on the shortcut", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(state()).toBe("open");
  });

  it("opens from a control, for anyone who will not find the chord", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("open"));

    expect(state()).toBe("open");
  });

  it("lists the table commands the host wired", () => {
    render(<Harness />);

    expect(commands()).toBe("print");
  });

  it("appends the host's own commands after them", () => {
    render(
      <Harness
        commandPalette={{
          commands: [{ key: "audit", label: "Audit", onSelect: vi.fn() }],
        }}
      />
    );

    expect(commands()).toBe("print,audit");
  });

  it("takes the host's shortcuts instead of the default", () => {
    render(
      <Harness
        commandPalette={{
          shortcuts: [{ chord: "ctrl+j", command: "command-palette" }],
        }}
      />
    );
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(state()).toBe("closed");

    fireEvent.keyDown(document, { key: "j", ctrlKey: true });

    expect(state()).toBe("open");
  });

  it("ignores a shortcut bound to some other command", () => {
    render(
      <Harness
        commandPalette={{
          shortcuts: [{ chord: "ctrl+j", command: "something-else" }],
        }}
      />
    );
    fireEvent.keyDown(document, { key: "j", ctrlKey: true });

    expect(state()).toBe("closed");
  });

  it("binds nothing when the prop is absent", () => {
    render(<Harness commandPalette={false} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(state()).toBe("closed");
    expect(commands()).toBe("");
  });
});
