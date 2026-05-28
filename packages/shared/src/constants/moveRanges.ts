import type { RangeType } from "../types/pokemon";
export type { RangeType };

export const RANGE_DISTANCES: Record<RangeType, number> = {
  melee: 80,
  ranged: 220,
  aoe: 200,
  self: 0,
};
