import type { Job } from "../types.js";
import { getJson, htmlToText, jobId } from "../util.js";

interface GhResponse {
  jobs: { id: number; title: string; absolute_url: string; updated_at: string; location?: { name?: string }; content?: string }[];
}

export async function fetchGreenhouse(slug: string, company: string): Promise<Job[]> {
  const data = await getJson<GhResponse>(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
  return data.jobs.map((j) => {
    const location = j.location?.name ?? "";
    return {
      id: jobId(company, j.title, location),
      source: "greenhouse",
      company,
      title: j.title,
      location,
      remote: /remote/i.test(location) ? true : null,
      url: j.absolute_url,
      description: htmlToText(j.content ?? ""),
      salary: null,
      postedAt: j.updated_at ?? null,
    };
  });
}
