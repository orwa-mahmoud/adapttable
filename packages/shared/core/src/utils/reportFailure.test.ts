import { afterEach, describe, expect, it, vi } from "vitest";

import { reportFailure } from "./reportFailure";

afterEach(() => vi.restoreAllMocks());

describe("reportFailure", () => {
  it("logs what failed with the error itself", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new Error("chunk failed");
    reportFailure('labels for "ar" did not load', error);
    expect(log).toHaveBeenCalledWith(
      '[adapttable] labels for "ar" did not load',
      error
    );
  });
});
