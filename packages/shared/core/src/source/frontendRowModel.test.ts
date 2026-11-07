import { describe, expect, it } from "vitest";

import { createTableEngine } from "../engine/createTableEngine";
import { frontendRowModelOf, withFrontendRowModel } from "./frontendRowModel";
import type { FrontendEngineFactory } from "./frontendSource";

const first: FrontendEngineFactory<unknown> = (options) =>
  createTableEngine(options);
const second: FrontendEngineFactory<unknown> = (options) =>
  createTableEngine(options);

describe("frontend row model carrier", () => {
  it("is absent until a feature carries an evaluator, and the later one wins", () => {
    expect(frontendRowModelOf([])).toBeUndefined();
    expect(frontendRowModelOf([{}])).toBeUndefined();
    expect(
      frontendRowModelOf([
        withFrontendRowModel({}, first),
        withFrontendRowModel({}, second),
      ])
    ).toBe(second);
    expect(frontendRowModelOf([withFrontendRowModel({ id: "g" }, first)])).toBe(
      first
    );
  });
});
