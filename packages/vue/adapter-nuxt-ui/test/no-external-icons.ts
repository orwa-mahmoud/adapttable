import { afterEach, beforeEach, expect, vi } from "vitest";

const requests: string[] = [];
// Genuine Nuxt icons must come from the installed collection. Catch an absent
// local asset before a vendor fallback can contact an external icon service.
globalThis.fetch = vi.fn<typeof fetch>((input) => {
  let url: string;
  if (typeof input === "string") url = input;
  else if (input instanceof URL) url = input.href;
  else url = input.url;
  requests.push(url);
  return Promise.reject(new Error(`Unexpected external request: ${url}`));
});
beforeEach(() => {
  vi.spyOn(console, "warn");
  vi.spyOn(console, "error");
});
afterEach(() => {
  expect(console.warn).not.toHaveBeenCalled();
  expect(console.error).not.toHaveBeenCalled();
  const observed = requests.splice(0);
  expect(observed, "Nuxt UI icons must be bundled locally").toEqual([]);
});
