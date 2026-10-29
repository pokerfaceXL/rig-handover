import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

const tmp = mkdtempSync(join(tmpdir(), 'rig-digest-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28');
  if (!night.found) throw new Error('night not found');

  it('reads 5 jobs, sorted by job, and 1 bad line', () => {
    expect(night.badLines).toBe(1);
    expect(night.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts retries and keeps the last status and error for fixtures/refresh', () => {
    expect(night.rows.find((r) => r.job === 'fixtures/refresh')).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
  });

  it('keeps digest/render with a null owner', () => {
    const row = night.rows.find((r) => r.job === 'digest/render');
    expect(row?.owner).toBeNull();
    expect(row?.lastStatus).toBe('ok');
    expect(row?.lastError).toBeNull();
  });

  it('keeps the offsets and the fail of notes/backup', () => {
    const sync = night.rows.find((r) => r.job === 'lane/sync');
    expect(sync?.firstAt).toBe('2026-10-28T23:00:06+01:00');
    expect(sync?.retries).toBe(1);
    expect(night.rows.find((r) => r.job === 'notes/backup')).toMatchObject({
      lastStatus: 'fail',
      lastError: 'quota exceeded',
      owner: 'lane-07',
    });
  });
});

describe('readNight edge cases (temp dir)', () => {
  it('a night with no file is not found', () => {
    expect(readNight(tmp, '2026-01-01')).toEqual({ night: '2026-01-01', found: false });
  });

  it('a night that is not a date is not found', () => {
    expect(readNight(tmp, '../etc')).toEqual({ night: '../etc', found: false });
  });

  it('an empty file is found with no rows', () => {
    writeFileSync(join(tmp, '2026-01-02.jsonl'), '');
    expect(readNight(tmp, '2026-01-02')).toEqual({ night: '2026-01-02', found: true, rows: [], badLines: 0 });
  });

  it('counts lines without a string at/job or a valid status, never throws', () => {
    const lines = [
      '{"at":"2026-01-03T01:00:00+01:00","job":"a","status":"ok","owner":"x"}',
      '{"job":"a","status":"ok"}',
      '{"at":"2026-01-03T02:00:00+01:00","job":1,"status":"ok"}',
      '{"at":"2026-01-03T02:00:00+01:00","job":"a","status":"done"}',
      '[1,2]',
      'not json',
      '',
    ];
    writeFileSync(join(tmp, '2026-01-03.jsonl'), lines.join('\n'));
    const night = readNight(tmp, '2026-01-03');
    expect(night).toMatchObject({ found: true, badLines: 5 });
    if (night.found) expect(night.rows).toHaveLength(1);
  });
});
