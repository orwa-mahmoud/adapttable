import { it } from "vitest";

import { toolbarExtrasParityTests } from "../../react/test/kit/suites/toolbarExtrasParity";
import { kit } from "./data-table.test-utils";

for (const test of toolbarExtrasParityTests(kit)) it(test.name, test.run);
