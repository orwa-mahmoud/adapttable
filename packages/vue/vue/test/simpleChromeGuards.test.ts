import { resolveLabels } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import { h, isVNode } from "vue";

import {
  type ActionButtonSlots,
  HistoryButtonsChrome,
  type HistoryButtonsChromeProps,
  PrintChrome,
} from "../src/actions/simpleChrome";
import { GROUP_ROW, groupRowSlotKey } from "../src/layout/groupRowSlot";

const labels = resolveLabels(undefined);
const missing = {} as unknown as ActionButtonSlots;
const toolbar = (
  slots: ActionButtonSlots,
  extra: Partial<HistoryButtonsChromeProps> = {}
): HistoryButtonsChromeProps => ({
  density: "comfortable",
  onDensityChange: vi.fn(),
  labels,
  slots,
  ...extra,
});

describe("simple action Chrome", () => {
  it("requires the kit's Button slot", () => {
    expect(() =>
      PrintChrome({ labels, dir: "ltr", onPrint: vi.fn(), slots: missing })
    ).toThrow("AdaptTable: PrintChrome requires the Button control slot.");
    expect(() => HistoryButtonsChrome(toolbar(missing))).toThrow(
      "AdaptTable: HistoryButtonsChrome requires the Button control slot."
    );
  });

  it("renders the print button and only the history buttons a host wires", () => {
    const Button = vi.fn<ActionButtonSlots["Button"]>(({ attrs, label }) =>
      h("button", attrs, label)
    );
    const print = PrintChrome({
      labels,
      dir: "ltr",
      onPrint: vi.fn(),
      slots: { Button },
    });
    expect(isVNode(print) && print.props?.["data-adapttable-part"]).toBe(
      "print-button"
    );
    expect(HistoryButtonsChrome(toolbar({ Button }))).toBeNull();
    Button.mockClear();
    HistoryButtonsChrome(
      toolbar({ Button }, { onUndo: vi.fn(), canUndo: false })
    );
    expect(Button).toHaveBeenCalledTimes(1);
    expect(Button.mock.calls[0]?.[0].attrs).toMatchObject({
      "data-adapttable-part": "undo-button",
      disabled: true,
    });
  });

  it("keeps one neutral group-row slot key for every row type", () => {
    expect(groupRowSlotKey<{ id: string }>()).toBe(GROUP_ROW);
  });
});
