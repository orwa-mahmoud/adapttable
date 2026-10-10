import type { DefineComponent } from "vue";

import type { Order, WorkspaceProps } from "./data";

/** TypeScript import contract; vue-tsc also checks the actual SFC source. */
declare const dispatch: DefineComponent<
  WorkspaceProps & { rows: readonly Order[] }
>;
export default dispatch;
