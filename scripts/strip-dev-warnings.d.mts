import type { TsdownPlugin } from "tsdown";

export function stripDevWarnings(options: {
  callee: string;
  include: (id: string) => boolean;
}): TsdownPlugin;
