import { afterEach, expect, it } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  Teleport,
} from "vue";

import {
  provideShadcnPortalContainer,
  shadcnPortal,
  useShadcnPortalContainer,
} from "../src/lib/portal";

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
it("inherits nested fullscreen destinations and preserves explicit portal targets across changes", async () => {
  const outer = document.createElement("section");
  const inner = document.createElement("section");
  const explicit = document.createElement("section");
  document.body.append(outer, inner, explicit);
  const current = shallowRef<HTMLElement | undefined>(outer);
  const override = shallowRef<HTMLElement | undefined>();
  const TestPortal = defineComponent(
    (props: { to: HTMLElement | string }, { slots }) =>
      () =>
        h(Teleport, { to: props.to }, slots.default?.() ?? []),
    { props: ["to"] }
  );
  const Portal = defineComponent({
    setup() {
      const read = useShadcnPortalContainer();
      return () =>
        h("div", [
          shadcnPortal(TestPortal, () =>
            h("span", { id: "inherited-portal" }, "Inherited")
          ),
          shadcnPortal(
            TestPortal,
            () => h("span", { id: "explicit-portal" }, "Explicit"),
            explicit
          ),
          h(
            "output",
            { id: "current-container" },
            read() === inner ? "inner" : "outer"
          ),
        ]);
    },
  });
  const Nested = defineComponent({
    setup() {
      provideShadcnPortalContainer(() => override.value);
      return () => h(Portal);
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    setup() {
      provideShadcnPortalContainer(() => current.value);
      return () => h(Nested);
    },
  });
  app.mount(host);
  stops.push(() => app.unmount());
  await nextTick();
  const inherited = document.getElementById("inherited-portal");
  expect(outer.contains(inherited)).toBe(true);
  expect(explicit.querySelector("#explicit-portal")).not.toBeNull();
  override.value = inner;
  await nextTick();
  expect(inner.contains(inherited)).toBe(true);
  expect(host.textContent).toBe("inner");
  override.value = undefined;
  current.value = undefined;
  await nextTick();
  expect(document.body.contains(inherited)).toBe(true);
  expect(inner.contains(inherited)).toBe(false);
  expect(explicit.querySelector("#explicit-portal")).not.toBeNull();
});
