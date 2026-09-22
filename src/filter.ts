import { filters } from "./config.js";
import type { Job } from "./types.js";

/** Returns a rejection reason, or null if the job should go on to scoring. */
export function hardFilter(job: Job): string | null {
  if (filters.titleExclude.test(job.title)) return "title excluded";
  if (!filters.titleInclude.test(job.title)) return "title not relevant";

  if (filters.requireRemoteMention && job.remote !== true) {
    const haystack = `${job.location}\n${job.description}`;
    if (job.remote === false || !/\bremote\b/i.test(haystack)) return "not remote";
  }

  if (job.postedAt) {
    const ageDays = (Date.now() - new Date(job.postedAt).getTime()) / 86_400_000;
    if (ageDays > filters.maxAgeDays) return "too old";
  }
  return null;
}
