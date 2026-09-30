import type { BoardSource } from "./types.js";

/**
 * Companies to poll directly. The slug is the last path segment of the company's
 * public job board URL:
 *   greenhouse: boards.greenhouse.io/<slug>  or  job-boards.greenhouse.io/<slug>
 *   lever:      jobs.lever.co/<slug>
 *   ashby:      jobs.ashbyhq.com/<slug>
 * These are starter guesses. A wrong slug just logs a 404, so verify and replace.
 */
export const companies: { source: BoardSource; slug: string; name: string }[] = [
  { source: "greenhouse", slug: "anthropic", name: "Anthropic" },
  { source: "greenhouse", slug: "gitlab", name: "GitLab" },
  { source: "greenhouse", slug: "scaleai", name: "Scale AI" },
  { source: "ashby", slug: "openai", name: "OpenAI" },
  { source: "ashby", slug: "cohere", name: "Cohere" },
  { source: "ashby", slug: "linear", name: "Linear" },
  { source: "lever", slug: "mistral", name: "Mistral AI" },
  // Remote-friendly AI / dev-tool startups (slugs verified against the live APIs)
  { source: "ashby", slug: "elevenlabs", name: "ElevenLabs" },
  { source: "ashby", slug: "supabase", name: "Supabase" },
  { source: "ashby", slug: "langchain", name: "LangChain" },
  { source: "ashby", slug: "modal", name: "Modal" },
  { source: "ashby", slug: "posthog", name: "PostHog" },
  { source: "ashby", slug: "cursor", name: "Cursor (Anysphere)" },
  { source: "ashby", slug: "sierra", name: "Sierra" },
  { source: "ashby", slug: "harvey", name: "Harvey" },
  { source: "greenhouse", slug: "vercel", name: "Vercel" },
  { source: "greenhouse", slug: "grafanalabs", name: "Grafana Labs" },
  { source: "greenhouse", slug: "discord", name: "Discord" },
];

export const useRemoteOk = true;

/** Global-remote boards. These are where postings open to Albania actually live. */
export const useHimalayas = true;
export const himalayasPages = 20; // 20 postings per page, newest first

export const useWeWorkRemotely = true;
export const wwrCategories = [
  "remote-programming-jobs",
  "remote-full-stack-programming-jobs",
  "remote-back-end-programming-jobs",
  "remote-devops-sysadmin-jobs",
];

/**
 * Which stated hiring regions work for someone in Albania (CET), hired as a contractor.
 * `allow` wins over `deny`, so "Americas, Europe, Israel" is kept while "USA, Canada" is not.
 * Postings that state no region at all fall through to the LLM, which judges the fine print.
 */
export const geo = {
  /**
   * Sources whose `location` is an authoritative hiring-region list, not a city.
   * For these, anything that doesn't match `allow` is a region lock — no LLM call needed.
   */
  strictSources: ["himalayas", "weworkremotely"] as const,
  allow:
    /\b(worldwide|anywhere|global(?:ly)?|emea|europe|european|eu\b|cet\b|cest\b|gmt|albania|balkans?|eastern europe|international)\b/i,
  deny:
    /\b(united states|u\.s\.a?\b|usa|us only|us-based|north america|latam|apac|canada|india|australia|new zealand|singapore|japan|brazil|argentina|mexico|philippines|nigeria|kenya|south africa|uk only|united kingdom only)\b/i,
};

/** Cheap deterministic filters that run before any LLM call. */
export const filters = {
  titleInclude:
    /\b(ai|ml|machine learning|llm|genai|generative|applied|nlp|agents?|research (engineer|scientist)|member of technical staff|software engineer|full[- ]?stack|backend)\b/i,
  titleExclude:
    /\b(intern|internship|junior|new grad|manager|director|vp|head of|recruiter|recruiting|sales|account executive|designer|counsel|economist|people research)\b/i,
  /** Keep only postings that mention remote somewhere. Geo eligibility is judged by the LLM. */
  requireRemoteMention: true,
  maxAgeDays: 45,
};

export const scoring = {
  minScoreForDigest: 55,
  digestSize: 10,
  maxPerRun: 40, // cost cap
  descriptionChars: 6000,
};
