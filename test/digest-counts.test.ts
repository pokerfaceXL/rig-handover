import { describe, expect, it } from 'vitest';
import { countNight } from '../src/digest/counts.js';
import type { DigestRow } from '../src/digest/types.js';

const row = (job: string, lastStatus: DigestRow['lastStatus'], retries: number): DigestRow => ({
  job,
  owner: null,
  runs: retries + 1,
  retries,
  lastStatus,
  lastError: null,
  firstAt: '2026-10-28T01:00:00+01:00',
  lastAt: '2026-10-28T01:05:00+01:00',
});

describe('countNight', () => {
  it('counts per job: fail first, then retried, then ok', () => {
    const rows = [row('a', 'ok', 0), row('b', 'ok', 2), row('c', 'fail', 3), row('d', 'fail', 0)];
    expect(countNight(rows)).toEqual({ ok: 1, retry: 1, fail: 2 });
  });

  it('is all zero for an empty night', () => {
    expect(countNight([])).toEqual({ ok: 0, retry: 0, fail: 0 });
  });
});
