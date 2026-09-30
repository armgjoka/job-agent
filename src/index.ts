import "dotenv/config";
import { companies, scoring, useHimalayas, useRemoteOk, useWeWorkRemotely } from "./config.js";
import { jobsAtStage, markFiltered, saveJobs, saveVerdict, setMyStatus } from "./db.js";
import { buildDigest } from "./digest.js";
import { hardFilter, pickDuplicates } from "./filter.js";
import { scoreJob } from "./score.js";
import { fetchAshby } from "./sources/ashby.js";
import { fetchGreenhouse } from "./sources/greenhouse.js";
import { fetchLever } from "./sources/lever.js";
import { fetchHimalayas } from "./sources/himalayas.js";
import { fetchRemoteOk } from "./sources/remoteok.js";
import { fetchWeWorkRemotely } from "./sources/weworkremotely.js";
import type { Job } from "./types.js";
import { sleep } from "./util.js";

const fetchers = { greenhouse: fetchGreenhouse, lever: fetchLever, ashby: fetchAshby };

async function fetchAll(): Promise<void> {
  const tasks: { label: string; run: () => Promise<Job[]> }[] = companies.map((c) => ({
    label: `${c.source}/${c.slug}`,
    run: () => fetchers[c.source](c.slug, c.name),
  }));
  if (useRemoteOk) tasks.push({ label: "remoteok", run: fetchRemoteOk });
  if (useHimalayas) tasks.push({ label: "himalayas", run: fetchHimalayas });
  if (useWeWorkRemotely) tasks.push({ label: "weworkremotely", run: fetchWeWorkRemotely });

  for (const t of tasks) {
    try {
      const jobs = await t.run();
      console.log(`${t.label}: ${jobs.length} postings, ${saveJobs(jobs)} new`);
    } catch (err) {
      console.warn(`${t.label}: FAILED ${(err as Error).message}`);
    }
    await sleep(500); // be polite
  }

  // Re-check everything still waiting, so edits to the filters apply to the existing queue too.
  const survivors: Job[] = [];
  for (const job of [...jobsAtStage("new", 1_000_000), ...jobsAtStage("passed", 1_000_000)]) {
    const reason = hardFilter(job);
    if (reason) markFiltered(job.id, reason);
    else survivors.push(job);
  }
  // Same role posted once per country: keep one, drop the rest.
  const dupes = pickDuplicates(survivors);
  for (const job of survivors) markFiltered(job.id, dupes.get(job.id) ?? null);
  for (const [id, reason] of dupes) markFiltered(id, reason);
  console.log(`filter: ${survivors.length - [...survivors].filter((j) => dupes.has(j.id)).length} passed to scoring, ${dupes.size} duplicates dropped`);
}

async function scoreAll(): Promise<void> {
  const queue = jobsAtStage("passed", scoring.maxPerRun);
  console.log(`scoring ${queue.length} postings`);
  for (const job of queue) {
    try {
      const v = await scoreJob(job);
      saveVerdict(job.id, v);
      console.log(`  ${String(v.score).padStart(3)} [geo:${v.location_eligible}] ${job.title} @ ${job.company}`);
    } catch (err) {
      console.warn(`  failed: ${job.title} @ ${job.company}: ${(err as Error).message}`);
    }
  }
}

function digest(): void {
  const path = buildDigest();
  console.log(path ? `digest written to ${path}` : "nothing new worth sending today");
}

const [cmd, ...args] = process.argv.slice(2);
switch (cmd) {
  case "fetch": await fetchAll(); break;
  case "score": await scoreAll(); break;
  case "digest": digest(); break;
  case "mark": {
    // npm start -- mark <id-prefix> applied|skipped|interviewing|rejected
    const [id, status] = args;
    if (!id || !status) throw new Error("usage: mark <id-prefix> <status>");
    console.log(`${setMyStatus(id, status)} updated`);
    break;
  }
  default:
    await fetchAll();
    await scoreAll();
    digest();
}
