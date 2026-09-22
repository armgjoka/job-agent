import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import type { Job, Verdict } from "./types.js";

mkdirSync("data", { recursive: true });
const db = new Database("data/jobs.db");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    remote INTEGER,
    url TEXT NOT NULL,
    description TEXT NOT NULL,
    salary TEXT,
    posted_at TEXT,
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    stage TEXT NOT NULL DEFAULT 'new',      -- new | passed | filtered_out | scored
    filter_reason TEXT,
    score INTEGER,
    verdict TEXT,                           -- JSON
    digested_at TEXT,
    my_status TEXT                          -- applied | skipped | interviewing | rejected
  );
  CREATE INDEX IF NOT EXISTS idx_jobs_stage ON jobs(stage);
`);

const insert = db.prepare(`
  INSERT OR IGNORE INTO jobs (id, source, company, title, location, remote, url, description, salary, posted_at)
  VALUES (@id, @source, @company, @title, @location, @remote, @url, @description, @salary, @postedAt)
`);

/** Returns how many postings were actually new. */
export function saveJobs(jobs: Job[]): number {
  const tx = db.transaction((rows: Job[]) => {
    let added = 0;
    for (const j of rows) {
      added += insert.run({ ...j, remote: j.remote === null ? null : Number(j.remote) }).changes;
    }
    return added;
  });
  return tx(jobs);
}

type Row = Omit<Job, "postedAt" | "remote"> & { posted_at: string | null; remote: number | null };
const toJob = (r: Row): Job => ({ ...r, postedAt: r.posted_at, remote: r.remote === null ? null : Boolean(r.remote) });

export function jobsAtStage(stage: "new" | "passed", limit = 1000): Job[] {
  return (db.prepare(`SELECT * FROM jobs WHERE stage = ? ORDER BY first_seen DESC LIMIT ?`).all(stage, limit) as Row[]).map(toJob);
}

export function markFiltered(id: string, reason: string | null): void {
  db.prepare(`UPDATE jobs SET stage = ?, filter_reason = ? WHERE id = ?`).run(reason ? "filtered_out" : "passed", reason, id);
}

export function saveVerdict(id: string, v: Verdict): void {
  db.prepare(`UPDATE jobs SET stage = 'scored', score = ?, verdict = ? WHERE id = ?`).run(v.score, JSON.stringify(v), id);
}

export interface ScoredJob extends Job { score: number; verdict: Verdict }

export function undigestedTop(minScore: number, limit: number): ScoredJob[] {
  const rows = db
    .prepare(
      `SELECT * FROM jobs
       WHERE stage = 'scored' AND digested_at IS NULL AND score >= ?
         AND json_extract(verdict, '$.location_eligible') != 'no'
       ORDER BY score DESC LIMIT ?`,
    )
    .all(minScore, limit) as (Row & { score: number; verdict: string })[];
  return rows.map((r) => ({ ...toJob(r), score: r.score, verdict: JSON.parse(r.verdict) as Verdict }));
}

export function markDigested(ids: string[]): void {
  const stmt = db.prepare(`UPDATE jobs SET digested_at = datetime('now') WHERE id = ?`);
  db.transaction(() => ids.forEach((id) => stmt.run(id)))();
}

export function setMyStatus(idPrefix: string, status: string): number {
  return db.prepare(`UPDATE jobs SET my_status = ? WHERE id LIKE ?`).run(status, `${idPrefix}%`).changes;
}

/** Past decisions, fed back into the scoring prompt as calibration examples. */
export function decisionExamples(limit = 8): { title: string; company: string; my_status: string }[] {
  return db
    .prepare(`SELECT title, company, my_status FROM jobs WHERE my_status IN ('applied','skipped') ORDER BY first_seen DESC LIMIT ?`)
    .all(limit) as { title: string; company: string; my_status: string }[];
}
