/**
 * React subscription adapter for {@link createTableEngine}.
 * The engine owns state; this hook re-renders on revision bumps.
 */
import { useDebugValue, useEffect, useRef, useSyncExternalStore } from "react";

import {
  createTableEngine,
  type CreateTableEngineOptions,
  type TableEngine,
} from "@adapttable/core";

function revisionToken<TRow>(engine: TableEngine<TRow>): string {
  const revisions = engine.snapshot().revisions;
  return `${revisions.data}:${revisions.view}:${revisions.schema}:${revisions.policy}`;
}

/**
 * Subscribe a React tree to one engine. Two calls create two isolated tables.
 *
 * @public
 */
export function useTableEngine<TRow>(
  options: CreateTableEngineOptions<TRow>
): TableEngine<TRow> {
  const engineRef = useRef<TableEngine<TRow> | undefined>(undefined);
  const generationRef = useRef(0);
  engineRef.current ??= createTableEngine(options);
  const engine = engineRef.current;

  const token = useSyncExternalStore(
    (onStoreChange) => engine.subscribe("all", onStoreChange),
    () => revisionToken(engine),
    () => revisionToken(engine)
  );

  useEffect(() => {
    const generation = ++generationRef.current;
    const owned = engine;
    return () => {
      queueMicrotask(() => {
        if (generationRef.current !== generation) return;
        owned.dispose();
        if (engineRef.current === owned) engineRef.current = undefined;
      });
    };
  }, [engine]);

  useDebugValue(token);
  return engine;
}
