import type {
  FilterHeaderRowSlots,
  FilterHeaderSlots,
} from "@adapttable/vue/adapter";

export const missingMulti: FilterHeaderSlots = {
  Search: () => null,
  Select: () => null,
  Range: () => null,
};
export const missingControl: FilterHeaderRowSlots<{ id: string }> = {};
