/** The code `findInTable()` brings to the table. */
import type { FindInTableImplementation } from "../featureImplementations";
import { injectFindInTable } from "./findInTable";
import {
  findMarkAttrs,
  injectFindFocus,
  injectFindScroll,
  injectFindShortcut,
  injectFindWindowScroll,
} from "./findMarks";

/**
 * Find in table's state, keyboard, scroll and marks, filed by `findInTable()`.
 *
 * @public
 */
export const FIND_IN_TABLE_IMPLEMENTATION: FindInTableImplementation = {
  state: injectFindInTable,
  shortcut: injectFindShortcut,
  scroll: injectFindScroll,
  focus: injectFindFocus,
  windowScroll: injectFindWindowScroll,
  markAttrs: findMarkAttrs,
};
