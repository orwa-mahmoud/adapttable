import { expect, it } from "vitest";
import { version } from "vue";

it("runs the selected Vue runtime", () => {
  expect(version).toBe(process.env.ADAPTTABLE_VUE_PEER_VERSION);
});
