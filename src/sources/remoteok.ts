import type { Job } from "../types.js";
import { getJson, htmlToText, jobId } from "../util.js";

interface RemoteOkItem {
  id?: string;
  position?: string;
  company?: string;
  location?: string;
  description?: string;
  url?: string;
  date?: string;
  salary_min?: number;
  salary_max?: number;
}

/** RemoteOK asks that you link back to the posting on their site, which the digest does. */
export async function fetchRemoteOk(): Promise<Job[]> {
  const data = await getJson<RemoteOkItem[]>("https://remoteok.com/api");
  return data
    .filter((j) => j.position && j.company && j.url) // first element is a legal notice
    .map((j) => {
      const location = j.location || "Remote";
      return {
        id: jobId(j.company!, j.position!, location),
        source: "remoteok",
        company: j.company!,
        title: j.position!,
        location,
        remote: true,
        url: j.url!,
        description: htmlToText(j.description ?? ""),
        salary: j.salary_min && j.salary_max ? `${j.salary_min}-${j.salary_max} USD` : null,
        postedAt: j.date ?? null,
      };
    });
}
