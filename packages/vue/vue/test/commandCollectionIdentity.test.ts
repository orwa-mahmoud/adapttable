import { slotRender } from "@adapttable/core/binding";
import { expect, it, vi } from "vitest";
import { effectScope } from "vue";

import { COMMAND_PALETTE_MODEL } from "../src/actions/contracts";
import { commandPalette } from "../src/command-palette";
import { extendFeature } from "../src/features/tableFeature";
import { print } from "../src/print";
import { useDataTableShell } from "../src/useDataTableShell";

it("retains the command collection across open changes and keeps retired built-in actions inactive", () => {
  const printed = vi.fn();
  const action = vi.fn();
  const scope = effectScope();
  const feature = commandPalette({
    commands: [{ key: "custom", label: "Custom", onSelect: action }],
  });
  const filled = extendFeature(
    feature,
    (feature.requiredSlots ?? []).map((slot) => slotRender(slot, () => null))
  );
  const shell = scope.run(() =>
    useDataTableShell({
      data: [{ id: "a" }],
      columns: [{ key: "id" }],
      rowKey: (row) => row.id,
      urlSync: false,
      features: [print(printed), filled],
    })
  );
  if (!shell) throw new Error("Missing shell");
  const state = shell.state.get(COMMAND_PALETTE_MODEL);
  const initial = state.value;
  if (!initial) throw new Error("Missing command model");
  const commands = initial.commands;
  initial.show();
  expect(state.value?.open).toBe(true);
  expect(state.value?.commands).toBe(commands);
  initial.close();
  expect(state.value?.open).toBe(false);
  expect(state.value?.commands).toBe(commands);
  const printCommand = commands.find((command) => command.key === "print");
  expect(printCommand).toBeDefined();
  scope.stop();
  printCommand?.onSelect();
  expect(printed).not.toHaveBeenCalled();
});
