/* SPDX-License-Identifier: MPL-2.0 */

import type { PracticeKind } from "./types";

export const PRACTICE_LABELS: Record<PracticeKind, string> = {
  sequential: "顺序练习",
  random: "随机练习",
  wrong: "错题练习",
  favorite: "收藏练习",
};
