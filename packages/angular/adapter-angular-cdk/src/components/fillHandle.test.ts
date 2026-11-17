import { it } from "vitest";

import { fillHandleTests } from "../../../angular/test/kit/suites/fillHandle";
import { kit } from "../../testing/kit";

for (const test of fillHandleTests(kit)) it(test.name, test.run);
