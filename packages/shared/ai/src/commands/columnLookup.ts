/** Finding a column by the name a caller used for it. */
import { columnIds, withEnum } from "../liveSchemas";
import type { AgentColumn, AgentObservation, CapabilityGuide } from "../types";
import { ApplyError } from "./command";

/** A name stripped of what never distinguishes two columns. */
function fold(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/**
 * The column a name refers to, in the table's own spelling.
 *
 * Columns are published with an id and a label and a caller picks from that
 * list, so a name that differs only in case or in surrounding space — or that
 * is the label rather than the id — has referred to exactly one column. An
 * exact id wins; two columns a name could equally mean resolve to neither,
 * and the caller is told what the table has.
 */
export function findColumn(
  columns: readonly AgentColumn[],
  name: string
): AgentColumn | undefined {
  const exact = columns.find((entry) => entry.id === name);
  if (exact) return exact;
  const wanted = fold(name);
  const [only, ...rest] = columns.filter(
    (entry) => fold(entry.id) === wanted || fold(entry.label) === wanted
  );
  return only && rest.length === 0 ? only : undefined;
}

/** What the table has, for a refusal that leaves the caller somewhere to go. */
export function columnNames(columns: readonly AgentColumn[]): string {
  return columns.map((entry) => entry.id).join(", ");
}

/** The column a name refers to, or a refusal that lists what the table has. */
export function knownColumn(
  observation: AgentObservation,
  asked: string
): AgentColumn {
  const column = findColumn(observation.columns, asked);
  if (column) return column;
  throw new ApplyError(
    "apply-failed",
    `unknown column "${asked}"; this table offers ${columnNames(observation.columns)}`
  );
}

/**
 * Which columns a command that names one will accept.
 *
 * The authored schema says `key` is a string; only the table knows which
 * strings. Publishing them as an `enum` is the difference between a caller
 * that can misname a column and one that cannot — and it follows the live
 * table, so a column that stops being sortable stops being offered.
 */
/*#__NO_SIDE_EFFECTS__*/
export function describeColumnChoice(
  property: string,
  usable: (column: AgentColumn) => boolean,
  nullable = false
): (guide: CapabilityGuide, observation: AgentObservation) => CapabilityGuide {
  return (guide, observation) => {
    const input = withEnum(
      guide.input,
      property,
      columnIds(observation.columns, usable),
      nullable
    );
    return input ? { ...guide, input } : guide;
  };
}
