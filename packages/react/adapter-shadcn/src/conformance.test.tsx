import { describe, it } from "vitest";

import { reactTableConformanceTests } from "../../react/test/kit/conformance";
import { kit } from "./data-table.test-utils";

describe(`table conformance — ${kit.name}`, () => {
  for (const test of reactTableConformanceTests(kit)) it(test.name, test.run);
});
