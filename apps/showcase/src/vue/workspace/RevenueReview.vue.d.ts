import type { DefineComponent } from "vue";

import type { Order, WorkspaceProps } from "./data";

/** TypeScript import contract; vue-tsc also checks the actual SFC source. */
declare const revenue: DefineComponent<
  WorkspaceProps & {
    rows: readonly Order[];
    onUpdate?: (rows: readonly Order[]) => void;
  }
>;
export default revenue;
