# Mission 001 v1 — First Autonomous Sale

This package adds the first ConnectIQ guided autonomous sales funnel.

## Included

- `/internet` paid-ad landing page
- ConnectIQ Brain v1 state and recommendation services
- Address lookup through the existing `lookupFccProviders` service
- Provider ranking and 70% revenue / 30% customer scoring fallback
- Guided customer Q&A
- Quote creation
- Ready-to-Submit Firestore lead/order creation
- UTM source, medium, and campaign capture

## Important

This is a deterministic guided advisor, not yet a live LLM integration. It is intentionally designed so OpenAI, ElevenLabs, or another AI provider can be connected to the Brain without rebuilding the customer flow.

## Install

From `C:\connectiqvscode` in Git Bash:

```bash
bash apply-mission001-v1.sh
npm run dev -- --force
```

Open:

```text
http://localhost:5173/internet
```

The backend used by the existing FCC/static lookup must also be running:

```bash
cd /c/connectiqvscode/functions
npm run dev
```

## Test

1. Open `/internet`.
2. Enter an address already present in the static FCC database.
3. Confirm a provider recommendation appears.
4. Ask a common question such as "Is this good for gaming?"
5. Enter name, email, and phone.
6. Click **Create Ready-to-Submit Order**.
7. Confirm the new record appears under Admin → Leads with status `Ready to Submit`.

## Known limitation

The current static FCC data package only contains the addresses you have imported. A non-matching address will not produce a recommendation until broader FCC availability data is imported.
