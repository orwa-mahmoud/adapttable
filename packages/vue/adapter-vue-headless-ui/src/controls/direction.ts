import { inject, type InjectionKey, provide } from "vue";

type Direction = "ltr" | "rtl";

const direction: InjectionKey<() => Direction | undefined> = Symbol(
  "adapttable-headless-direction"
);

/** The table's reading direction, for overlays that Headless UI does not size by it. */
export function provideHeadlessDirection(
  read: () => Direction | undefined
): void {
  provide(direction, read);
}

export function useHeadlessDirection(): () => Direction | undefined {
  return inject(direction, () => undefined);
}
