/** A rekey moves what the table keeps by row id: the shared suite. */
import { it } from "vitest";

import { rowRekeyTests } from "../../angular/test/kit/suites/rowRekey";
import { kit } from "../testing/kit";

for (const test of rowRekeyTests(kit)) it(test.name, test.run);
