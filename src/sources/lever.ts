import type { Job } from "../types.js";
import { getJson, jobId } from "../util.js";

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt?: number;
  workplaceType?: string;
  categories?: { location?: string; allLocations?: string[] };
  descriptionPlain?: string;
  additionalPlain?: string;
  lists?: { text: string; content: string }[];
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
}

export async function fetchLever(slug: string, company: string): Promise<Job[]> {
  const data = await getJson<LeverPosting[]>(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  return data.map((p) => {
    const location = p.categories?.allLocations?.join(" / ") ?? p.categories?.location ?? "";
    const lists = (p.lists ?? []).map((l) => `${l.text}\n${l.content.replace(/<li>/g, "- ").replace(/<[^>]+>/g, "\n")}`);
    const s = p.salaryRange;
    return {
      id: jobId(company, p.text, location),
      source: "lever",
      company,
      title: p.text,
      location,
      remote: p.workplaceType === "remote" ? true : p.workplaceType ? false : null,
      url: p.hostedUrl,
      description: [p.descriptionPlain, ...lists, p.additionalPlain].filter(Boolean).join("\n\n"),
      salary: s?.min && s?.max ? `${s.min}-${s.max} ${s.currency ?? ""} ${s.interval ?? ""}`.trim() : null,
      postedAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    };
  });
}
