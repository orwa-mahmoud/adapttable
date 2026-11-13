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
import { createContext, type ReactNode, useContext, useMemo } from "react";

import type { DataTableClassNames } from "../types";

/** Stable identity, so a table with no `classNames` never churns consumers. */
const NO_CLASSES: DataTableClassNames = {};

const ClassNamesContext = createContext<DataTableClassNames>(NO_CLASSES);

/** The same map, readable by any key. */
type ClassesByKey = Readonly<Partial<Record<string, string>>>;

const ClassesByKeyContext = createContext<ClassesByKey>({});

/** Publish one component's class map to the slots beneath it. */
export function ClassNamesProvider({
  classNames,
  children,
}: Readonly<{
  classNames?: DataTableClassNames;
  children: ReactNode;
}>) {
  const map = classNames ?? NO_CLASSES;
  // A plain object, because the class map is an interface and an interface
  // is not readable by an arbitrary key.
  const byKey = useMemo<ClassesByKey>(() => ({ ...map }), [map]);
  return (
    <ClassNamesContext.Provider value={map}>
      <ClassesByKeyContext.Provider value={byKey}>
        {children}
      </ClassesByKeyContext.Provider>
    </ClassNamesContext.Provider>
  );
}

/** The class map of the nearest enclosing component. Empty outside one. */
export function useClassNames(): DataTableClassNames {
  return useContext(ClassNamesContext);
}

/** A part's `classNames` key: the part name, camelCased. */
const keyOfPart = (part: string): string =>
  part.replaceAll(/-([a-z])/g, (_match, letter: string) =>
    letter.toUpperCase()
  );

/**
 * The host's class for the element carrying `part`: every part takes the
 * class of its camelCased key, so a control the binding names needs no table
 * of its own here.
 */
export function useClassOfPart(part: string | undefined): string | undefined {
  const byKey = useContext(ClassesByKeyContext);
  return part === undefined ? undefined : byKey[keyOfPart(part)];
}
