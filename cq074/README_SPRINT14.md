# ConnectIQ Sprint 14A - Live FCC Provider Engine

This package replaces the fallback FCC lookup route with the live FCC fabric workflow that was reverse engineered from the FCC National Broadband Map.

## What changes

- Uses FCC Fabric Address API:
  `/nbm/map/api/fabric/address/{fabricId}/{address}`
- Uses FCC Fabric Detail API:
  `/nbm/map/api/fabric/detail/{fabricId}/{locationId}?fabric_vintage=2025-12-31`
- Returns real providers from FCC:
  brand, provider ID, FRN, holding company, technology, download/upload, latency, residential/business flags.
- Keeps your current admin UI, CRM, authentication, diagnostics, and routing intact.

## Apply

From `C:\connectiqvscode`:

```bash
bash apply-sprint14a.sh
```

Then restart backend and frontend:

```bash
cd /c/connectiqvscode/functions
npm run dev
```

```bash
cd /c/connectiqvscode
npm run dev -- --force
```

Test:

- `http://localhost:5173/admin/fcc-lookup`
- address: `101 Plum Creek Ln Greenville SC 29607`

## Commit

```bash
git add .
git commit -m "Sprint 14A live FCC provider engine"
git push -u origin sprint-14a-live-fcc-provider-engine
```
