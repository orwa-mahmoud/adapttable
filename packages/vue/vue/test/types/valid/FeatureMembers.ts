import type * as Binding from "@adapttable/vue";
import type {
  ColumnDef,
  FeatureState,
  RenderFunction,
  ResolvedTableOptions,
  UseDataTableResult,
} from "@adapttable/vue";
import type * as Adapter from "@adapttable/vue/adapter";
import type * as Features from "@adapttable/vue/features";

interface Person {
  readonly id: string;
  readonly name: string;
}

export interface FeatureMembers {
  readonly column: ColumnDef<Person>;
  readonly state: FeatureState;
  readonly options: ResolvedTableOptions<Person>;
  readonly table: UseDataTableResult<Person>;
  readonly render: RenderFunction<Person>;
}

type WindowImplementationHelper = "windowBodySlots" | "windowBodyColumns";
type ExposedWindowHelper = Extract<
  WindowImplementationHelper,
  keyof typeof Binding | keyof typeof Adapter | keyof typeof Features
>;
export const windowHelpersStayInternal: ExposedWindowHelper extends never
  ? true
  : false = true;
