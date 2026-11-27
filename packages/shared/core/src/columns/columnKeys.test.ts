import { afterEach, describe, expect, it, vi } from "vitest";

import { resetDevWarnings } from "../utils/devWarn";
import { warnDuplicateColumnKeys } from "./columnKeys";

afterEach(() => {
  resetDevWarnings();
  vi.restoreAllMocks();
});

describe("warnDuplicateColumnKeys", () => {
  it("warns once for each key declared twice", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    warnDuplicateColumnKeys([
      { key: "name" },
      { key: "age" },
      { key: "name" },
      { key: "name" },
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('duplicate column key "name"')
    );
  });

  it("stays quiet when every key is unique", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    warnDuplicateColumnKeys([{ key: "name" }, { key: "age" }]);
    expect(warn).not.toHaveBeenCalled();
  });
});
