/**
 * What a refusal tells the caller.
 */
import { describe, expect, it } from "vitest";

import { validateSchema } from "./validate";

describe("an argument the schema does not take", () => {
  it("names what the capability does take", () => {
    // A backend told only "not allowed" has to guess again or spend a round on
    // `describe` — and under a compact context, where the guide it needed was
    // deferred by design, guessing is how it got here.
    const schema = {
      type: "object",
      additionalProperties: false as const,
      properties: { key: { type: "string" }, dir: { type: "string" } },
    };
    expect(validateSchema(schema, { groupBy: "team" })).toBe(
      "$.groupBy is not allowed; this takes key, dir"
    );
  });

  it("says so plainly when it takes nothing", () => {
    expect(
      validateSchema(
        {
          type: "object",
          additionalProperties: false as const,
          properties: {},
        },
        { anything: 1 }
      )
    ).toBe("$.anything is not allowed; this takes no arguments");
  });
});

describe("an argument the schema requires", () => {
  it("names the values it takes when the schema names them", () => {
    const schema = {
      type: "object",
      properties: {
        side: { type: ["string", "null"], enum: ["top", "bottom", null] },
      },
      required: ["side"],
    };
    expect(validateSchema(schema, {})).toBe(
      "$.side is required — one of top, bottom"
    );
  });

  it("says only that it is required when there is no set to name", () => {
    expect(
      validateSchema(
        {
          type: "object",
          properties: { key: { type: "string" } },
          required: ["key"],
        },
        {}
      )
    ).toBe("$.key is required");
  });
});
