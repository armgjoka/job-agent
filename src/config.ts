import type { SourceName } from "./types.js";

/**
 * Companies to poll directly. The slug is the last path segment of the company's
 * public job board URL:
 *   greenhouse: boards.greenhouse.io/<slug>  or  job-boards.greenhouse.io/<slug>
 *   lever:      jobs.lever.co/<slug>
 *   ashby:      jobs.ashbyhq.com/<slug>
 * These are starter guesses. A wrong slug just logs a 404, so verify and replace.
 */
export const companies: { source: Exclude<SourceName, "remoteok">; slug: string; name: string }[] = [
  { source: "greenhouse", slug: "anthropic", name: "Anthropic" },
  { source: "greenhouse", slug: "gitlab", name: "GitLab" },
  { source: "greenhouse", slug: "scaleai", name: "Scale AI" },
  { source: "ashby", slug: "openai", name: "OpenAI" },
  { source: "ashby", slug: "cohere", name: "Cohere" },
  { source: "ashby", slug: "linear", name: "Linear" },
  { source: "lever", slug: "mistral", name: "Mistral AI" },
];

export const useRemoteOk = true;

/** Cheap deterministic filters that run before any LLM call. */
export const filters = {
  titleInclude:
    /\b(ai|ml|machine learning|llm|genai|generative|applied|nlp|agents?|software engineer|full[- ]?stack|backend)\b/i,
  titleExclude:
    /\b(intern|internship|junior|new grad|manager|director|vp|head of|recruiter|sales|account executive|designer|counsel)\b/i,
  /** Keep only postings that mention remote somewhere. Geo eligibility is judged by the LLM. */
  requireRemoteMention: true,
  maxAgeDays: 45,
};

export const scoring = {
  minScoreForDigest: 65,
  digestSize: 10,
  maxPerRun: 40, // cost cap
  descriptionChars: 6000,
};
