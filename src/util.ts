import { createHash } from "node:crypto";

export function jobId(company: string, title: string, location: string): string {
  const key = [company, title, location].map((s) => s.trim().toLowerCase()).join("|");
  return createHash("sha1").update(key).digest("hex").slice(0, 16);
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ",
};

/** Good-enough HTML to text. Greenhouse double-escapes, so decode before stripping. */
export function htmlToText(html: string): string {
  const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);
  return decode(decode(html))
    .replace(/<(br|\/p|\/li|\/h\d|\/div)\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();
}

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "job-agent/0.1 (personal use)", Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return (await res.json()) as T;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
