export type SourceName = "greenhouse" | "lever" | "ashby" | "remoteok";

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
