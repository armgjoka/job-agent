import Anthropic from "@anthropic-ai/sdk";
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { scoring } from "./config.js";
import { decisionExamples } from "./db.js";
import type { Job, Verdict } from "./types.js";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY
const MODEL = process.env.SCORING_MODEL ?? "claude-sonnet-5";

/**
 * The tool schema asks for arrays of strings, but the model sometimes sends a single
 * string or omits an empty list. Normalize instead of losing the whole verdict.
 */
const stringList = z.preprocess((v) => {
  if (v == null) return [];
  if (typeof v === "string") {
    const lines = v
      .split(/\r?\n|^\s*[-*•]\s*/m)
      .map((s) => s.replace(/^\s*[-*•]\s*/, "").trim())
      .filter(Boolean);
    return lines.length > 1 ? lines : v.trim() ? [v.trim()] : [];
  }
  return v;
}, z.array(z.string()));

const VerdictSchema = z.object({
  score: z.number().min(0).max(100),
  location_eligible: z.enum(["yes", "no", "unclear"]),
  summary: z.string(),
  reasons: stringList,
  red_flags: stringList,
});

function readProfile(file: string): string {
  const path = `profile/${file}`;
  if (!existsSync(path)) throw new Error(`Missing ${path}. Paste your CV text / preferences there first.`);
  return readFileSync(path, "utf8");
}

function systemPrompt(): string {
  const examples = decisionExamples();
  const calibration = examples.length
    ? `\n\n<past_decisions>\n${examples.map((e) => `- ${e.my_status}: ${e.title} @ ${e.company}`).join("\n")}\n</past_decisions>`
    : "";
  return `You screen job postings for one candidate. Be a skeptical recruiter on the candidate's side: a wasted application costs them time.

<cv>
${readProfile("cv.md")}
</cv>

<preferences>
${readProfile("preferences.md")}
</preferences>${calibration}

Scoring guide: 85+ apply today, 65-84 worth a look, below 65 skip.
location_eligible: "no" if the posting restricts hiring to countries, states, time zones, or work authorization the candidate can't meet (e.g. "US only", "must be authorized to work in the US", "remote within Canada"). "unclear" if it just says "remote" with no geography. "yes" only if it is explicitly worldwide or names the candidate's region, or offers contractor/EOR hiring.
Keep reasons and red_flags short and specific to this posting. Do not pad.`;
}

export async function scoreJob(job: Job): Promise<Verdict> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: systemPrompt(),
    tools: [
      {
        name: "record_verdict",
        description: "Record the screening verdict for this posting.",
        input_schema: {
          type: "object",
          properties: {
            score: { type: "integer", minimum: 0, maximum: 100 },
            location_eligible: { type: "string", enum: ["yes", "no", "unclear"] },
            summary: { type: "string", description: "One sentence: what the role actually is." },
            reasons: { type: "array", items: { type: "string" }, description: "Up to 3 reasons it fits." },
            red_flags: { type: "array", items: { type: "string" }, description: "Up to 3 concerns. Empty if none." },
          },
          required: ["score", "location_eligible", "summary", "reasons", "red_flags"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "record_verdict" },
    messages: [
      {
        role: "user",
        content: `Company: ${job.company}
Title: ${job.title}
Location: ${job.location || "not stated"}
Salary: ${job.salary ?? "not stated"}

${job.description.slice(0, scoring.descriptionChars)}`,
      },
    ],
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("Model returned no verdict");
  return VerdictSchema.parse(block.input);
}
