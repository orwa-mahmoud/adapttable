import type { RenderFunction } from "@adapttable/vue";
import type {
  ColumnDef,
  FeatureState,
  ResolvedTableOptions,
  UseDataTableResult,
} from "@adapttable/vue/features";

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
