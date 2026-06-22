# MedAdhere

AI-powered medication reminder and drug-interaction checker.
Built for **Elevate 2026** (Ideakode) — Theme: AI / Healthcare.

## What it does

1. Add medications with dosage and a daily reminder time.
2. The app checks every pair of your medications for known interactions
   using real FDA label data (via the free openFDA API) and RxNorm
   (NIH's drug-name standardization API).
3. An AI layer turns the raw FDA text into a plain-language warning with
   a severity rating (low / moderate / high), so a non-medical person
   can actually understand it. If no AI key is configured, a rule-based
   fallback keeps this working anyway — the demo never breaks.
4. A background scheduler checks medication times every minute and logs
   reminders to an in-app feed.

## Tech stack

- **Backend:** Node.js + Express
- **Storage:** MongoDB (via Mongoose) — connect your own Atlas cluster
- **Scheduling:** node-cron
- **AI:** OpenAI Chat Completions API (optional — see below)
- **Frontend:** plain HTML/CSS/JS dashboard (no build step needed)
- **External data:** RxNorm (NIH) + openFDA — both free, no API key required

## Setup

```bash
npm install
cp .env.example .env
# then paste your MongoDB Atlas connection string into .env as MONGODB_URI
npm start
```

Then open **http://localhost:3000**.

### MongoDB Atlas setup notes

- In Atlas, go to **Network Access** and allow your current IP (or
  `0.0.0.0/0` for hackathon convenience — just don't leave that open in
  a real production app).
- Your connection string looks like:
  `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/medadhere`
- The `medadhere` database and its collections are created automatically
  on first write — no manual setup needed.

### Optional: enable real AI summaries

Without an OpenAI key, interaction summaries use a keyword-based
fallback (still functional, just less nuanced). To use real AI:

1. Get an API key from https://platform.openai.com
2. Put it in `.env` as `OPENAI_API_KEY=sk-...`
3. Restart the server

## Project structure

```
medadhere/
├── server.js                  # Express app entry point + DB connect
├── src/
│   ├── db.js                  # MongoDB (Mongoose) connection
│   ├── models/
│   │   ├── Medication.js      # Mongoose schema
│   │   └── Notification.js    # Mongoose schema
│   ├── routes/medications.js  # CRUD + interaction-check endpoints
│   └── services/
│       ├── rxnorm.js          # Drug name → RxCUI lookup
│       ├── openfda.js         # Pulls interaction text from FDA labels
│       ├── aiSummary.js       # AI (or fallback) plain-language summary
│       └── reminderScheduler.js  # Cron job for reminders
└── public/                    # Frontend dashboard
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/medications` | List all medications |
| POST | `/api/medications` | Add a medication `{ name, dosage, time }` |
| DELETE | `/api/medications/:id` | Remove a medication |
| GET | `/api/medications/interactions` | Check all pairs for interactions |
| GET | `/api/medications/notifications` | Get reminder feed |

## Deploying for submission

Push this to GitHub, then deploy free on **Render** or **Railway**:
1. Connect your GitHub repo.
2. Set start command: `npm start`.
3. Add the `OPENAI_API_KEY` env var on the platform's dashboard if using it.

## Demo script (for your 2–5 min video)

1. Add 2 medications known to interact (e.g. Warfarin + Ibuprofen).
2. Click "Check Interactions" — show the AI-generated plain-language
   warning with severity color-coding.
3. Add a reminder time a minute in the future and show the in-app
   notification appear.
4. Close with the impact pitch: medication mismanagement is a leading
   cause of preventable hospital visits, especially for patients on
   multiple prescriptions — MedAdhere makes that risk visible in plain
   English, not medical jargon.

## Roadmap / stretch ideas (mention in pitch deck for "Scalability & Impact")

- Push notifications / SMS reminders (Twilio)
- Multi-user accounts + real database
- Pharmacist-verified interaction overrides
- Multi-language plain-English summaries
- Integration with pharmacy/EHR systems
