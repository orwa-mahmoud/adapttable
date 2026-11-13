import { it } from "vitest";

import { findWithoutNavTests } from "../../react/test/kit/suites/findWithoutNav";
import { kit } from "./data-table.test-utils";

for (const test of findWithoutNavTests(kit)) it(test.name, test.run);
