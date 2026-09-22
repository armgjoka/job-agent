import type { Job } from "../types.js";
import { getJson, htmlToText, jobId } from "../util.js";

interface AshbyResponse {
  jobs: {
    id: string;
    title: string;
    location?: string;
    isRemote?: boolean;
    isListed?: boolean;
    jobUrl: string;
    publishedAt?: string;
    descriptionPlain?: string;
    descriptionHtml?: string;
    compensation?: { compensationTierSummary?: string };
  }[];
}

export async function fetchAshby(slug: string, company: string): Promise<Job[]> {
  const data = await getJson<AshbyResponse>(
    `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`,
  );
  return data.jobs
    .filter((j) => j.isListed !== false)
    .map((j) => {
      const location = j.location ?? "";
      return {
        id: jobId(company, j.title, location),
        source: "ashby",
        company,
        title: j.title,
        location,
        remote: j.isRemote ?? null,
        url: j.jobUrl,
        description: j.descriptionPlain ?? htmlToText(j.descriptionHtml ?? ""),
        salary: j.compensation?.compensationTierSummary ?? null,
        postedAt: j.publishedAt ?? null,
      };
    });
}
