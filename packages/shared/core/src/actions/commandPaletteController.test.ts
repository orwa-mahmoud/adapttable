/**
 * The command palette, armed: when it is on, what it lists, and whose open
 * state wins.
 *
 * A palette that is never armed simply never appears, and nothing on screen
 * is missing — so the arming rule and the list are checked as directly as
 * the open state.
 */
import { describe, expect, it, vi } from "vitest";

import {
  commandPaletteCommands,
  createCommandPaletteController,
  isCommandPaletteArmed,
  OPEN_PALETTE_COMMAND,
} from "./commandPaletteController";

const LABELS = {};
const command = (key: string, label = key) => ({
  key,
  label,
  onSelect: vi.fn(),
});

describe("OPEN_PALETTE_COMMAND", () => {
  it("is the command the default shortcut names", () => {
    expect(OPEN_PALETTE_COMMAND).toBe("command-palette");
  });
});

describe("isCommandPaletteArmed", () => {
  it("follows the prop when the host wrote one", () => {
    expect(isCommandPaletteArmed(true, undefined)).toBe(true);
    expect(isCommandPaletteArmed({}, undefined)).toBe(true);
    expect(isCommandPaletteArmed(false, [command("audit")])).toBe(false);
  });

  it("arms an absent prop only when a feature registered commands", () => {
    expect(isCommandPaletteArmed(undefined, undefined)).toBe(false);
    expect(isCommandPaletteArmed(undefined, [])).toBe(false);
    expect(isCommandPaletteArmed(undefined, [command("audit")])).toBe(true);
  });
});

describe("commandPaletteCommands", () => {
  it("lists nothing when the palette is not armed", () => {
    expect(
      commandPaletteCommands({
        enabled: false,
        labels: LABELS,
        onPrint: vi.fn(),
      })
    ).toHaveLength(0);
  });

  it("lists the table commands the host wired", () => {
    const onPrint = vi.fn();
    const onExport = vi.fn();
    const onClearFilters = vi.fn();
    const commands = commandPaletteCommands({
      enabled: true,
      labels: LABELS,
      onPrint,
      onExport,
      exportLabel: "Export TSV",
      onClearFilters,
      hasFilters: true,
    });

    expect(commands.map((item) => [item.key, item.label])).toEqual([
      ["print", "Print"],
      ["export", "Export TSV"],
      ["clear-filters", "Clear all"],
    ]);
    expect(commands[2]?.disabled).toBe(false);
  });

  it("appends the host's commands, then the features', the later key winning", () => {
    const featureAudit = command("audit", "Feature audit");
    const commands = commandPaletteCommands({
      enabled: true,
      labels: LABELS,
      onPrint: vi.fn(),
      commands: [command("audit", "Host audit"), command("host")],
      registered: [featureAudit, command("feature")],
    });

    expect(commands.map((item) => item.key)).toEqual([
      "print",
      "audit",
      "host",
      "feature",
    ]);
    expect(commands[1]).toBe(featureAudit);
  });

  it("lists the features' commands when the host has none", () => {
    const commands = commandPaletteCommands({
      enabled: true,
      labels: LABELS,
      registered: [command("feature")],
    });

    expect(commands.map((item) => item.key)).toEqual(["feature"]);
  });
});

describe("createCommandPaletteController", () => {
  it("starts closed, with a stable snapshot", () => {
    const controller = createCommandPaletteController({});

    expect(controller.getSnapshot().open).toBe(false);
    expect(controller.getSnapshot()).toBe(controller.getSnapshot());
  });

  it("opens and closes its own state, telling the host each time", () => {
    const onOpenChange = vi.fn();
    const controller = createCommandPaletteController({ onOpenChange });
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.setOpen(true);

    expect(controller.getSnapshot().open).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    controller.setOpen(false);

    expect(controller.getSnapshot().open).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("reports a repeated request without notifying", () => {
    const onOpenChange = vi.fn();
    const controller = createCommandPaletteController({ onOpenChange });
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.setOpen(false);

    expect(listener).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps no state of its own while the host controls it", () => {
    const onOpenChange = vi.fn();
    const controller = createCommandPaletteController({
      open: false,
      onOpenChange,
    });
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.setOpen(true);

    expect(controller.getSnapshot().open).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("reads the latest configuration without notifying", () => {
    const controller = createCommandPaletteController({ open: true });
    const listener = vi.fn();
    controller.subscribe(listener);
    const onOpenChange = vi.fn();
    controller.configure({ onOpenChange });

    expect(listener).not.toHaveBeenCalled();

    controller.setOpen(true);

    expect(controller.getSnapshot().open).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("stops telling a listener once it unsubscribes", () => {
    const controller = createCommandPaletteController({});
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    unsubscribe();
    controller.setOpen(true);

    expect(listener).not.toHaveBeenCalled();
    expect(controller.getSnapshot().open).toBe(true);
  });
});
