import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { RigConfig } from '../src/config.js';

// Routes run against a temp runs dir; the real runs/ is never read or written here.
let runsDir: string;
let config: RigConfig;

const validNight = [
  '{"at":"2026-10-28T23:00:06+01:00","job":"lane/sync","status":"retry","owner":"rook","error":"upstream 503"}',
  '{"at":"2026-10-28T23:00:40+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
  '{"at":"2026-10-28T22:00:00+01:00","job":"digest/render","status":"ok","owner":null}',
].join('\n');

const badLineNight = [
  '{"at":"2026-10-27T23:00:06+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}',
  'not json',
  '{"at":"2026-10-27T23:00:40+01:00","job":"lane/sync","status":"fail","owner":"rook","error":"quota exceeded"}',
].join('\n');

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
  writeFileSync(join(runsDir, '2026-10-28.jsonl'), validNight + '\n');
  writeFileSync(join(runsDir, '2026-10-27.jsonl'), badLineNight + '\n');
  writeFileSync(join(runsDir, '2026-10-26.jsonl'), '');
  config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir };
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

// Job names in the order the page lists them (first cell of each table row).
function jobsOnPage(html: string): string[] {
  const body = html.slice(html.indexOf('<tbody>'), html.indexOf('</tbody>'));
  return [...body.matchAll(/<tr[^>]*>\s*<td>([^<]*)<\/td>/g)].map((m) => m[1] ?? '');
}

describe('GET /digest/:night (page)', () => {
  it('200 for a night with a valid file, one row per job', async () => {
    const res = await createApp(config).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('digest 2026-10-28');
    expect(jobsOnPage(html)).toEqual(['digest/render', 'lane/sync']);
  });

  it('404 for a night with no file', async () => {
    const res = await createApp(config).request('/digest/2026-01-01');
    const html = await res.text();
    expect(res.status).toBe(404);
    expect(html).toContain('no run log for this night');
  });

  it('the empty night says "nothing ran"', async () => {
    const res = await createApp(config).request('/digest/2026-10-26');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
    expect(jobsOnPage(html)).toEqual([]);
  });

  it('a night with a bad line is still 200, with the good rows and a note', async () => {
    const res = await createApp(config).request('/digest/2026-10-27');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(jobsOnPage(html)).toEqual(['lane/sync', 'rig/rotate-logs']);
    expect(html).toContain('1 line did not parse');
  });
});

describe('GET /api/digest/:night (JSON)', () => {
  it('200 for a night with a valid file, rows with the retry counted', async () => {
    const res = await createApp(config).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ night: '2026-10-28', badLines: 0 });
    expect(body.rows.map((r: { job: string }) => r.job)).toEqual(['digest/render', 'lane/sync']);
    expect(body.rows[1]).toMatchObject({ job: 'lane/sync', owner: 'rook', runs: 2, retries: 1, lastStatus: 'ok' });
    expect(body.rows[0].owner).toBeNull();
  });

  it('404 for a night with no file', async () => {
    const res = await createApp(config).request('/api/digest/2026-01-01');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night', night: '2026-01-01' });
  });

  it('the empty night has rows []', async () => {
    const res = await createApp(config).request('/api/digest/2026-10-26');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-10-26', rows: [], badLines: 0 });
  });

  it('a night with a bad line is still 200, badLines 1 and the good rows present', async () => {
    const res = await createApp(config).request('/api/digest/2026-10-27');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r: { job: string }) => r.job)).toEqual(['lane/sync', 'rig/rotate-logs']);
    expect(body.rows[0]).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order for one night', async () => {
    const app = createApp(config);
    const page = await app.request('/digest/2026-10-28');
    const json = await app.request('/api/digest/2026-10-28');
    const jobs = ((await json.json()) as { rows: { job: string }[] }).rows.map((r) => r.job);
    expect(jobsOnPage(await page.text())).toEqual(jobs);
  });
});
