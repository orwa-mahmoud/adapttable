import { nextTick } from "vue";

import { finishOverlayFocus } from "../src/actions/focusHandoff";

afterEach(() => document.body.replaceChildren());

function fixture() {
  const host = document.createElement("section");
  const opener = document.createElement("button");
  const root = document.createElement("div");
  const input = document.createElement("input");
  host.append(opener);
  root.append(input);
  document.body.append(host, root);
  input.focus();
  const focus = vi.spyOn(opener, "focus");
  return { host, opener, root, input, focus };
}

it("returns focus after a native overlay is removed", async () => {
  const { opener, root, focus } = fixture();
  finishOverlayFocus(opener, root, () => true);
  root.remove();
  await nextTick();
  expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
  expect(document.activeElement).toBe(opener);
});

it("keeps focus inside the opener's existing modal", async () => {
  const { host, opener, root } = fixture();
  host.setAttribute("aria-modal", "true");
  finishOverlayFocus(opener, root, () => true);
  await nextTick();
  expect(document.activeElement).toBe(opener);
});

it.each(["opener", "root", "both"])("ignores a missing %s", async (missing) => {
  const { opener, root, input, focus } = fixture();
  finishOverlayFocus(
    missing === "root" ? opener : null,
    missing === "opener" ? root : null,
    () => true
  );
  await nextTick();
  expect(focus).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(input);
});

it("does not start a handoff when the overlay no longer owns focus", async () => {
  const { opener, root, focus } = fixture();
  const outside = document.createElement("button");
  document.body.append(outside);
  outside.focus();
  finishOverlayFocus(opener, root, () => true);
  await nextTick();
  expect(focus).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(outside);
});

it.each([
  "retired",
  "detached",
  "disabled",
  "aria-disabled",
  "hidden",
  "inert",
  "display",
  "visibility",
  "new modal",
  "new focus",
])("cancels the queued handoff for a %s owner", async (condition) => {
  const { host, opener, root, focus } = fixture();
  let current = true;
  finishOverlayFocus(opener, root, () => current);
  if (condition === "retired") current = false;
  if (condition === "detached") opener.remove();
  if (condition === "disabled") opener.disabled = true;
  if (condition === "aria-disabled")
    opener.setAttribute("aria-disabled", "true");
  if (condition === "hidden") host.hidden = true;
  if (condition === "inert") host.setAttribute("inert", "");
  if (condition === "display") host.style.display = "none";
  if (condition === "visibility") host.style.visibility = "hidden";
  if (condition === "new modal") {
    const modal = document.createElement("div");
    modal.setAttribute("aria-modal", "true");
    document.body.append(modal);
  }
  if (condition === "new focus") {
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
  }
  await nextTick();
  expect(focus).not.toHaveBeenCalled();
  expect(document.activeElement).not.toBe(opener);
});
