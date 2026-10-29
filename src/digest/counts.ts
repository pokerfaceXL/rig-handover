import type { DigestRow } from './types.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// Per job, so the three add up to the number of jobs:
// fail = lastStatus 'fail'; retry = other jobs with retries > 0; ok = the rest.
export function countNight(rows: DigestRow[]): NightCounts {
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const r of rows) {
    if (r.lastStatus === 'fail') counts.fail++;
    else if (r.retries > 0) counts.retry++;
    else counts.ok++;
  }
  return counts;
}
