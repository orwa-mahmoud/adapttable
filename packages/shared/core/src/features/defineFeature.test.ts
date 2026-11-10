import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type ActionDefinition,
  createTableStore,
  defineAction,
  defineSlice,
  type SliceKey,
} from "../state/tableStore";
import {
  defineFeature,
  type FeatureActions,
  featureState,
  isDefinedFeature,
} from "./defineFeature";
import { applyTableFeatures, type PatchFeature } from "./featurePatch";

interface Row {
  id: string;
  name: string;
}

const DRAFT = defineSlice<Readonly<Record<string, string>>>(
  "test/draft",
  () => ({})
);
const GROUP_KEYS = defineSlice<readonly string[]>("test/groupKeys", () => []);

const editDraft = defineAction<{
  readonly rowId: string;
  readonly value: string;
}>("test/editDraft", (store, { rowId, value }) =>
  store.update(DRAFT, (draft) => ({ ...draft, [rowId]: value }))
);
const groupBy = defineAction<readonly string[]>("test/groupBy", (store, keys) =>
  store.write(GROUP_KEYS, keys)
);

function editing() {
  return defineFeature<
    Row,
    { draft: typeof DRAFT },
    { editDraft: typeof editDraft }
  >({
    id: "editing",
    options: () => ({ onCellEdit: () => undefined }),
    slices: { draft: DRAFT },
    actions: { editDraft },
    labels: { editCell: "Edit cell" },
  });
}

function grouping() {
  return defineFeature<
    Row,
    { groupKeys: typeof GROUP_KEYS },
    { groupBy: typeof groupBy }
  >({
    id: "grouping",
    options: () => ({ groupBy: "team" }),
    slices: { groupKeys: GROUP_KEYS },
    actions: { groupBy },
    urlKeys: ["groupBy"],
  });
}

describe("defineFeature", () => {
  it("is a patch feature the table's options compose", () => {
    const feature = editing();
    expect(isDefinedFeature(feature)).toBe(true);
    const options = applyTableFeatures({
      features: [feature, grouping()],
      data: [],
    });
    expect(options).toMatchObject({ groupBy: "team", data: [] });
    expect(typeof (options as { onCellEdit?: unknown }).onCellEdit).toBe(
      "function"
    );
    expectTypeOf(feature).toExtend<PatchFeature<Row>>();
  });

  it("types a table's slices and actions as exactly its features'", () => {
    const state = featureState([editing(), grouping()]);
    expectTypeOf(state.slices.draft).toEqualTypeOf<typeof DRAFT>();
    expectTypeOf(state.slices.groupKeys).toEqualTypeOf<
      SliceKey<readonly string[]>
    >();
    expectTypeOf(state.actions.editDraft).toEqualTypeOf<
      ActionDefinition<{ readonly rowId: string; readonly value: string }>
    >();
    expectTypeOf(state.actions.groupBy).toEqualTypeOf<
      ActionDefinition<readonly string[]>
    >();

    const editingOnly = featureState([editing()]);
    expectTypeOf(editingOnly.actions).not.toHaveProperty("groupBy");
    expectTypeOf(editingOnly.slices).not.toHaveProperty("groupKeys");
    expectTypeOf<FeatureActions<[]>>().toEqualTypeOf<unknown>();
  });

  it("runs a feature's actions on the table's store", () => {
    const store = createTableStore();
    const { actions, slices } = featureState([editing(), grouping()]);
    store.dispatch(actions.editDraft({ rowId: "a", value: "Ada" }));
    store.dispatch(actions.groupBy(["team"]));
    expect(store.read(slices.draft)).toEqual({ a: "Ada" });
    expect(store.read(slices.groupKeys)).toEqual(["team"]);
  });

  it("leaves a plain patch feature's state empty", () => {
    const plain: PatchFeature<Row> = { id: "plain", apply: () => ({}) };
    const state = featureState([plain]);
    expect(state).toEqual({ slices: {}, actions: {} });
  });
});
