# Sprint 16A - Static FCC Carrier Recommendation Database

This sprint replaces the unstable FCC browser-only live lookup with a stable local FCC static dataset.

## What it adds

- `functions/data/fccStaticAvailability.json`
- `functions/services/staticFccAvailability.js`
- `GET /api/fcc/static-status`
- Updated `POST /api/fcc/lookup`

## How it works

1. Advisor enters an address in FCC Lookup.
2. Backend matches the address against `fccStaticAvailability.json`.
3. Backend returns provider rows from the static FCC data.
4. Providers are scored and enriched with ConnectIQ intelligence: install ETA, commission, promo, DSI support, reliability, latency.
5. Saving the lookup to a lead stores those provider recommendations in Firestore.

## Test Address

Use:

`101 Plum Creek Ln Greenville SC 29607`

Expected providers:

- AT&T Fiber
- WOW Internet
- Spectrum
- Verizon
- T-Mobile
- Starlink
- HughesNet
- Viasat

## Weekly FCC Updates

For now, update `functions/data/fccStaticAvailability.json` when you pull a new FCC export or manually capture a provider list. The schema is intentionally simple.

Later we can add a CSV uploader/importer so employees can upload new FCC rows from the admin UI.

## Apply

```bash
cd /c/connectiqvscode
bash apply-sprint16a.sh
```

## Run

Backend:

```bash
cd /c/connectiqvscode/functions
npm run dev
```

Frontend:

```bash
cd /c/connectiqvscode
npm run dev -- --force
```

## Test backend

```bash
curl http://localhost:5001/api/fcc/static-status

curl -X POST http://localhost:5001/api/fcc/lookup \
  -H "Content-Type: application/json" \
  -d '{"address":"101 Plum Creek Ln Greenville SC 29607"}'
```
