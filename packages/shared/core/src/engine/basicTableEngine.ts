/**
 * A table that filters, sorts, and searches, and does not group or aggregate.
 *
 * The session is the same one {@link createTableEngine} uses. The evaluator
 * is the basic row model, so grouping and aggregate code is not in this graph.
 */
import { createBasicRowModel } from "./basicRowModel";
import type {
  CreateTableEngineOptions,
  TableEngine,
} from "./createTableEngine";
import { createTableSession } from "./tableSession";

/**
 * Create a table engine with the basic evaluator.
 *
 * @public
 */
export function createBasicTableEngine<TRow>(
  options: CreateTableEngineOptions<TRow>
): TableEngine<TRow> {
  return createTableSession(options, createBasicRowModel());
}
