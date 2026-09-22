# job-agent

Fetch postings → hard-filter → LLM-score against your CV → daily markdown digest.

## Setup
    npm install
    cp .env.example .env        # add ANTHROPIC_API_KEY
    cp profile/preferences.example.md profile/preferences.md
    # paste CV text into profile/cv.md, fill the TODOs in profile/preferences.md
    # edit the company list in src/config.ts

## Use
    npm start                   # fetch + score + digest (out/digest-YYYY-MM-DD.md)
    npm run fetch | score | digest
    npm start -- mark 94c2a69a applied     # or skipped / interviewing / rejected

Applied/skipped marks are fed back into the scoring prompt as calibration.
Data lives in data/jobs.db (SQLite).
