// One night's run log, runs/<night>.jsonl, read into one row per job.

// A run's outcome, as the log writes it.
export type RunStatus = 'ok' | 'retry' | 'fail';

// One job's night. Times are the log's ISO strings, offset kept (never converted to UTC).
export type DigestRow = {
  job: string;
  owner: string | null; // null in the log; the row is kept and shown as `—`
  runs: number; // lines for this job
  retries: number; // lines with status 'retry'
  lastStatus: RunStatus;
  lastError: string | null; // the latest `error` seen for this job, null if none
  firstAt: string;
  lastAt: string;
};

// A night with no file is `found: false` (404). An empty file is found with no rows ("nothing ran").
// Lines that don't parse are counted in `badLines`, never thrown.
export type Night =
  | { night: string; found: false }
  | { night: string; found: true; rows: DigestRow[]; badLines: number };

// Reads runs/<night>.jsonl from runsDir. Implemented in src/digest/read.ts.
export type ReadNight = (runsDir: string, night: string) => Night;
