import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  applyTableUrlState,
  captureTableUrlState,
  parseTableUrlState,
  updateTableUrlState,
} from "./urlStateCodec";

const nsArb = fc.constantFrom("", "t.", "left.");
const valueArb = fc.string({ maxLength: 48 });

function params(search: string): URLSearchParams {
  return new URLSearchParams(search);
}

describe("versioned table URL state — properties", () => {
  it("stamps version 1 and decodes what it encodes", () => {
    fc.assert(
      fc.property(nsArb, valueArb, valueArb, (namespace, search, label) => {
        const encoded = updateTableUrlState("app=keep", namespace, (table) => {
          table.set(namespace + "q", search);
          table.set(namespace + "f_label", label);
        });
        const decoded = parseTableUrlState(encoded, namespace);
        expect(decoded.get(namespace + "atv")).toBe("1");
        expect(decoded.get(namespace + "q")).toBe(search);
        expect(decoded.get(namespace + "f_label")).toBe(label);
        expect(params(encoded).get("app")).toBe("keep");
      })
    );
  });

  it("capture then apply restores the table slice and keeps foreign params", () => {
    fc.assert(
      fc.property(nsArb, valueArb, valueArb, (namespace, search, foreign) => {
        const encoded = updateTableUrlState("", namespace, (table) => {
          table.set(namespace + "q", search);
          table.set(namespace + "page", "3");
        });
        const captured = captureTableUrlState(encoded, namespace);
        const restored = applyTableUrlState(
          `${namespace}q=stale&app=${encodeURIComponent(foreign)}`,
          captured,
          namespace
        );
        const next = params(restored);
        expect(next.get(namespace + "q")).toBe(search);
        expect(next.get(namespace + "page")).toBe("3");
        expect(next.get(namespace + "atv")).toBe("1");
        expect(next.get("app")).toBe(foreign);
      })
    );
  });

  it("an unknown version marker contributes no recognized state", () => {
    fc.assert(
      fc.property(
        nsArb,
        fc
          .string({ minLength: 1, maxLength: 8, unit: "grapheme-ascii" })
          .filter((v) => v !== "1" && !/[&=%]/.test(v)),
        valueArb,
        (namespace, version, search) => {
          const raw = `${namespace}atv=${encodeURIComponent(version)}&${namespace}q=${encodeURIComponent(search)}`;
          expect(parseTableUrlState(raw, namespace).toString()).toBe("");
        }
      )
    );
  });
});
