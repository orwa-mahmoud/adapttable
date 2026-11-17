import { it } from "vitest";

import { editValidationTests } from "../../angular/test/kit/suites/editValidation";
import { kit } from "../testing/kit";

for (const test of editValidationTests(kit)) it(test.name, test.run);
