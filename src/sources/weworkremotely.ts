import { wwrCategories } from "../config.js";
import type { Job } from "../types.js";
import { getText, htmlToText, jobId, sleep } from "../util.js";

const tag = (xml: string, name: string): string => {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(xml);
  return m?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, "").trim() ?? "";
};

/**
 * WeWorkRemotely has no JSON API, but each category exposes an RSS feed with a
 * <region> field ("Anywhere in the World", "Europe Only", …) that the geo filter reads.
 * Titles arrive as "Company: Role".
 */
export async function fetchWeWorkRemotely(): Promise<Job[]> {
  const out: Job[] = [];

  for (const category of wwrCategories) {
    const xml = await getText(`https://weworkremotely.com/categories/${category}.rss`);
    for (const block of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
      const rawTitle = htmlToText(tag(block, "title"));
      const url = tag(block, "link");
      if (!rawTitle || !url) continue;

      const [company, ...rest] = rawTitle.split(":");
      const title = rest.join(":").trim();
      if (!company || !title) continue;

      const location = tag(block, "region") || "Not stated";
      const pubDate = tag(block, "pubDate");
      const posted = pubDate ? new Date(pubDate) : null;
      out.push({
        id: jobId(company.trim(), title, location),
        source: "weworkremotely",
        company: company.trim(),
        title,
        location,
        remote: true,
        url,
        description: htmlToText(tag(block, "description")),
        salary: null,
        postedAt: posted && !Number.isNaN(posted.getTime()) ? posted.toISOString() : null,
      });
    }
    await sleep(300);
  }
  return out;
}
