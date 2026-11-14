import { it } from "vitest";

import { pivotRowHeaderTests } from "../../../angular/test/kit/suites/pivotRowHeader";
import { kit } from "../../testing/kit";

for (const test of pivotRowHeaderTests(kit)) it(test.name, test.run);
