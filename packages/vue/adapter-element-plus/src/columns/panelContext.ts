import type { InjectionKey, ShallowRef } from "vue";

/** A managed menu's actual native content host, outside its scrolling body. */
export const columnMenuContainer: InjectionKey<
  Readonly<ShallowRef<HTMLElement | null>>
> = Symbol("element-column-menu-container");
