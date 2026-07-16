# Sprint 11 — FCC Live Admin Lookup

This package adds an admin-side FCC Carrier Intelligence workflow:

- Backend FCC authentication diagnostic
- Census geocoding for typed addresses
- Admin FCC Lookup page
- Provider ranking table
- Ability to save lookup results to a lead record
- Safe fallback providers if FCC provider endpoint mapping is unavailable

## Important

FCC authentication has been validated through `listAsOfDates`. The exact FCC provider-availability endpoint is wrapped behind an adapter. If FCC endpoint candidates do not return provider rows, ConnectIQ returns fallback providers and notes the lookup status instead of breaking the advisor workflow.

Optional: add a `BROADBANDMAP_API_KEY` to `functions/.env` to use BroadbandMap.com's API as a live provider source while the raw FCC endpoint is finalized.

## Apply

```bash
bash apply-sprint11.sh
cd functions
npm run dev
```

In a second terminal:

```bash
npm run dev -- --force
```

Test:

- http://localhost:5001/api/fcc/diagnostic
- http://localhost:5173/admin/fcc-lookup

Commit:

```bash
git add .
git commit -m "Sprint 11 FCC live admin lookup"
git push -u origin sprint-11-fcc-live-admin-lookup
```
