import { it } from "vitest";

import { multiSortSeedTests } from "../../react/test/kit/suites/multiSortSeed";
import { kit } from "./data-table.test-utils";

for (const test of multiSortSeedTests(kit)) it(test.name, test.run);
