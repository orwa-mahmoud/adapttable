import { it } from "vitest";

import { findWithNavTests } from "../../react/test/kit/suites/findWithNav";
import { kit } from "./data-table.test-utils";

for (const test of findWithNavTests(kit)) it(test.name, test.run);
