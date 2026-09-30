import { himalayasPages } from "../config.js";
import type { Job } from "../types.js";
import { getJson, htmlToText, jobId, sleep } from "../util.js";

interface HimalayasJob {
  title?: string;
  companyName?: string;
  description?: string;
  applicationLink?: string;
  guid?: string;
  pubDate?: number; // unix seconds
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string | null;
  locationRestrictions?: string[];
}

interface HimalayasPage {
  jobs: HimalayasJob[];
  nextCursor?: string | null;
}

/**
 * Himalayas returns 20 newest-first per page and has no server-side search, so we walk
 * `himalayasPages` pages of the feed and let the usual title/geo filters do the narrowing.
 */
export async function fetchHimalayas(): Promise<Job[]> {
  const out: Job[] = [];
  let cursor: string | null | undefined;

  for (let page = 0; page < himalayasPages; page++) {
    const url = `https://himalayas.app/jobs/api?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const data = await getJson<HimalayasPage>(url);
    for (const j of data.jobs ?? []) {
      if (!j.title || !j.companyName) continue;
      const url = j.applicationLink || j.guid;
      if (!url) continue;
      // An empty restriction list means the company hires from anywhere.
      const location = j.locationRestrictions?.length ? j.locationRestrictions.join(", ") : "Worldwide";
      out.push({
        id: jobId(j.companyName, j.title, location),
        source: "himalayas",
        company: j.companyName,
        title: j.title,
        location,
        remote: true,
        url,
        description: htmlToText(j.description ?? ""),
        salary:
          j.minSalary && j.maxSalary ? `${j.minSalary}-${j.maxSalary} ${j.currency ?? "USD"}` : null,
        postedAt: j.pubDate ? new Date(j.pubDate * 1000).toISOString() : null,
      });
    }
    cursor = data.nextCursor;
    if (!cursor) break;
    await sleep(300);
  }
  return out;
}
