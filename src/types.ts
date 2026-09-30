/** Company-specific ATS boards, polled per company slug. */
export type BoardSource = "greenhouse" | "lever" | "ashby";
/** Aggregators, polled once each. */
export type FeedSource = "remoteok" | "himalayas" | "weworkremotely";
export type SourceName = BoardSource | FeedSource;

/** One normalized posting, whatever board it came from. */
export interface Job {
  id: string; // stable hash of company + title + location
  source: SourceName;
  company: string;
  title: string;
  location: string;
  remote: boolean | null; // null = source doesn't say
  url: string;
  description: string; // plain text
  salary: string | null;
  postedAt: string | null; // ISO
}

export interface Verdict {
  score: number; // 0-100
  location_eligible: "yes" | "no" | "unclear";
  summary: string;
  reasons: string[];
  red_flags: string[];
}

export type Fetcher = () => Promise<Job[]>;
