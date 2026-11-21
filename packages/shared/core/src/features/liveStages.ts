/**
 * Live stages: the controllers a composed feature mounts once the table's
 * chrome is built — find, the keyboard grid, export, the selection figures.
 *
 * A feature brings its stage as one more render. The base walks the stages it
 * was given and names none of them: each stage says which live values it
 * reads and the one it writes, and the walk runs every writer before its
 * readers. A table that composes none of these features walks nothing and
 * carries none of their code.
 */
import { type FeatureRender, type FeatureSlotKey } from "./featureKeys";

/**
 * The live values a stage reads, and the one value it writes.
 *
 * @public
 */
export interface LiveStageDependencies {
  /** Values written by earlier stages that this stage reads. */
  readonly reads: readonly string[];
  /** The value this stage produces for the stages after it and the table. */
  readonly writes: string;
}

/**
 * The slot a feature fills with its live stage.
 *
 * @public
 */
export interface LiveStageKey<TProps> extends FeatureSlotKey<TProps> {
  /** What the stage reads and writes, which places it in the walk. */
  readonly stage: LiveStageDependencies;
}

/**
 * Name a live stage and what it reads and writes.
 *
 * @param id - The stage's id, conventionally its feature's.
 * @param stage - The values it reads and the one it writes.
 * @returns The key a feature fills with `slotRender`.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function liveStageKey<TProps>(
  id: string,
  stage: LiveStageDependencies
): LiveStageKey<TProps> & { readonly __draw?: undefined } {
  return { id, single: true, stage };
}

/**
 * One composed stage, ready to run.
 *
 * @public
 */
export interface LiveStage<TNode = unknown> {
  /** The stage's id. */
  readonly id: string;
  /** What it reads and writes. */
  readonly stage: LiveStageDependencies;
  /** Runs the stage with the base's props. */
  readonly render: (props: never) => TNode;
}

function isLiveStageKey(
  slot: FeatureSlotKey<never>
): slot is LiveStageKey<never> {
  return "stage" in slot;
}

/**
 * The live stages a feature list brings, each after every stage that writes
 * a value it reads. Stages with no order between them keep id order, so the
 * same features always chain the same way whatever order the host wrote.
 *
 * @param features - The table's composed features.
 * @returns The stages in the order they run.
 * @throws When two stages write the same value, or stages read each other's
 *   values in a cycle — both are composition errors that no order can fix.
 *
 * @public
 */
export function liveStagesOf<TNode>(
  features: readonly {
    readonly id: string;
    readonly renders?: readonly FeatureRender<never, TNode>[];
  }[]
): readonly LiveStage<TNode>[] {
  const byId = new Map<string, LiveStage<TNode>>();
  for (const feature of features) {
    for (const entry of feature.renders ?? []) {
      if (!isLiveStageKey(entry.slot)) continue;
      byId.set(entry.slot.id, {
        id: entry.slot.id,
        stage: entry.slot.stage,
        render: entry.render,
      });
    }
  }
  return orderLiveStages([...byId.values()]);
}

/**
 * Stages in the order they run: each after every stage that writes a value it
 * reads, ties broken by id.
 *
 * @param stages - The stages to order.
 * @returns The same stages, ordered.
 * @throws When two stages write the same value, or read each other in a cycle.
 *
 * @public
 */
export function orderLiveStages<TNode>(
  stages: readonly LiveStage<TNode>[]
): readonly LiveStage<TNode>[] {
  const writer = new Map<string, string>();
  for (const { id, stage } of stages) {
    const other = writer.get(stage.writes);
    if (other !== undefined) {
      throw new Error(
        `[adapttable] live stages "${other}" and "${id}" both write "${stage.writes}"`
      );
    }
    writer.set(stage.writes, id);
  }
  const pending = [...stages].sort((left, right) =>
    left.id < right.id ? -1 : 1
  );
  const done = new Set<string>();
  const ordered: LiveStage<TNode>[] = [];
  while (pending.length > 0) {
    const index = pending.findIndex(({ stage }) =>
      stage.reads.every((value) => {
        const from = writer.get(value);
        return from === undefined || done.has(from);
      })
    );
    if (index === -1) {
      throw new Error(
        `[adapttable] live stages read each other in a cycle: ${pending
          .map((entry) => entry.id)
          .join(", ")}`
      );
    }
    const [next] = pending.splice(index, 1);
    if (next === undefined) break;
    ordered.push(next);
    done.add(next.id);
  }
  return ordered;
}
