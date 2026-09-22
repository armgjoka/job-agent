import { mkdirSync, writeFileSync } from "node:fs";
import { scoring } from "./config.js";
import { markDigested, undigestedTop } from "./db.js";

export function buildDigest(): string | null {
  const jobs = undigestedTop(scoring.minScoreForDigest, scoring.digestSize);
  if (jobs.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const body = jobs
    .map((j) => {
      const v = j.verdict;
      const geo = v.location_eligible === "unclear" ? " · geo unclear, check before applying" : "";
      return [
        `## ${j.score} · ${j.title} · ${j.company}`,
        `${j.location || "Location not stated"}${j.salary ? ` · ${j.salary}` : ""}${geo}`,
        "",
        v.summary,
        ...v.reasons.map((r) => `- ${r}`),
        ...v.red_flags.map((r) => `- ⚠ ${r}`),
        "",
        `${j.url}`,
        `\`id: ${j.id.slice(0, 8)}\``,
      ].join("\n");
    })
    .join("\n\n");

  const md = `# Job digest · ${today}\n\n${body}\n`;
  mkdirSync("out", { recursive: true });
  const path = `out/digest-${today}.md`;
  writeFileSync(path, md);
  markDigested(jobs.map((j) => j.id));
  return path;
}
