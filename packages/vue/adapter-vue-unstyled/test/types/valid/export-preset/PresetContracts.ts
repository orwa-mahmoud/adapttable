import type {
  FilterDef as BindingFilterDef,
  UseSavedViewsOptions as BindingSavedViewsOptions,
} from "@adapttable/vue";
import type {
  FilterDef,
  StandardFeatureOptions,
  UseSavedViewsOptions,
} from "@adapttable/vue-unstyled/preset";

interface Person {
  id: string;
  name: string;
}

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;

export type FilterIdentity = Assert<
  Equal<FilterDef<Person>, BindingFilterDef<Person>>
>;
export type SavedViewsIdentity = Assert<
  Equal<UseSavedViewsOptions, BindingSavedViewsOptions>
>;
export type PresetFilterIdentity = Assert<
  Equal<
    NonNullable<StandardFeatureOptions<Person>["filters"]>[number],
    BindingFilterDef<Person>
  >
>;
export type PresetSavedViewsIdentity = Assert<
  Equal<
    NonNullable<StandardFeatureOptions<Person>["savedViews"]>,
    BindingSavedViewsOptions
  >
>;
