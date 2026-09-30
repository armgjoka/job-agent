import { filters, geo } from "./config.js";
import type { Job } from "./types.js";

/** Returns a rejection reason, or null if the job should go on to scoring. */
export function hardFilter(job: Job): string | null {
  if (filters.titleExclude.test(job.title)) return "title excluded";
  if (!filters.titleInclude.test(job.title)) return "title not relevant";

  if (filters.requireRemoteMention && job.remote !== true) {
    const haystack = `${job.location}\n${job.description}`;
    if (job.remote === false || !/\bremote\b/i.test(haystack)) return "not remote";
  }

  // Region locks are stated plainly on the remote boards; drop them before paying for an LLM call.
  if (job.location && !geo.allow.test(job.location)) {
    const strict = (geo.strictSources as readonly string[]).includes(job.source);
    if (strict || geo.deny.test(job.location)) return "region locked";
  }

  if (job.postedAt) {
    const ageDays = (Date.now() - new Date(job.postedAt).getTime()) / 86_400_000;
    if (ageDays > filters.maxAgeDays) return "too old";
  }
  return null;
}

/**
 * Boards like Grafana's list the same role once per country ("… | Spain | Remote").
 * Collapse those to one posting so a single role can't eat a whole scoring batch.
 */
export function dedupeKey(job: Job): string {
  const base = (job.title.split("|")[0] ?? job.title)
    .replace(/\((?:remote|hybrid|onsite)[^)]*\)/gi, "")
    .replace(/[\u2013\u2014-]\s*(remote|hybrid|onsite)\b.*$/i, "")
    .replace(/,\s*(remote|us|usa|uk|emea|canada|europe|germany|spain|sweden|ireland|australia|singapore|india|london|new york|san francisco)\b.*$/i, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
  return `${job.company.toLowerCase()}::${base}`;
}

/** Marks all but one posting per (company, role) as duplicates. Keeps the most remote-looking one. */
export function pickDuplicates(jobs: Job[]): Map<string, string> {
  const groups = new Map<string, Job[]>();
  for (const j of jobs) {
    const k = dedupeKey(j);
    groups.set(k, [...(groups.get(k) ?? []), j]);
  }
  const dupes = new Map<string, string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const rank = (j: Job) =>
      /worldwide|anywhere|global/i.test(j.location) ? 0 : /remote/i.test(j.location) ? 1 : 2;
    const [keep, ...rest] = [...group].sort((a, b) => rank(a) - rank(b));
    if (!keep) continue;
    for (const j of rest) dupes.set(j.id, `duplicate of ${keep.id.slice(0, 8)}`);
  }
  return dupes;
}
