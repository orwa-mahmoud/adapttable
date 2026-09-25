/**
 * The class map, for slots that live at module scope.
 *
 * A slot written inside its parent reaches `classNames` for free, but it is
 * also a brand-new component *type* on every render of that parent — and React
 * remounts a subtree whose type changed. The cost is not theoretical: a
 * remounted input loses focus and its caret mid-keystroke, and an open panel
 * closes. Memoizing the slots object hides it only until the memo's own
 * dependency changes.
 *
 * So the slots are hoisted out, and this is how they still get the map. One
 * provider per component instance, which is what keeps two tables with
 * different maps on one page from sharing whichever rendered last — the exact
 * failure a module-level binding would have.
 */
import { createContext, type ReactNode, useContext } from "react";

import type { DataTableClassNames } from "../types";

/** Stable identity, so a table with no `classNames` never churns consumers. */
const NO_CLASSES: DataTableClassNames = {};

const ClassNamesContext = createContext<DataTableClassNames>(NO_CLASSES);

/** Publish one component's class map to the slots beneath it. */
export function ClassNamesProvider({
  classNames,
  children,
}: Readonly<{
  classNames?: DataTableClassNames;
  children: ReactNode;
}>) {
  return (
    <ClassNamesContext.Provider value={classNames ?? NO_CLASSES}>
      {children}
    </ClassNamesContext.Provider>
  );
}

/** The class map of the nearest enclosing component. Empty outside one. */
export function useClassNames(): DataTableClassNames {
  return useContext(ClassNamesContext);
}
