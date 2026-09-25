import { afterEach, describe, expect, it, vi } from "vitest";

import { devWarn, resetDevWarnings } from "./devWarn";

afterEach(() => {
  resetDevWarnings();
  vi.restoreAllMocks();
});

describe("devWarn", () => {
  it("logs a prefixed warning once per unique message", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    devWarn("something is off");
    devWarn("something is off");
    devWarn("something else");
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith("[adapttable] something is off");
    expect(warn).toHaveBeenCalledWith("[adapttable] something else");
  });

  it("is silent in production builds", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    try {
      devWarn("never shown");
      expect(warn).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
