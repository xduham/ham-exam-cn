/* SPDX-License-Identifier: MPL-2.0 */

import { clearAppData } from "../storage";
import { loadStats } from "../stats";

/** Stats snapshot plus the destructive reset command used by the stats view. */
export function useStatsOverview() {
  const stats = loadStats();

  function resetAll(): void {
    clearAppData();
    window.location.reload();
  }

  return { stats, resetAll };
}
