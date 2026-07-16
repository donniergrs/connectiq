# ConnectIQ v0.6.2 — FCC BDC Data Engine & Import Recovery

## Fixed

- Replaced undocumented FCC map endpoint guessing with an indexed local FCC BDC repository.
- Empty FCC results remain empty and never generate a default carrier.
- Lead Intake creates lead cards before provider enrichment, eliminating the indefinite import spinner.
- New leads are written in Firestore batches and enrichment runs separately with controlled concurrency.
- Provider lookup failures and a missing BDC database are recorded as explicit statuses.

## Added

- SQLite-backed FCC BDC provider repository.
- Flexible BDC CSV/TSV ingestion utility.
- Dataset version, as-of date, and row-count status reporting.
- `npm run fcc:import` and `npm run fcc:status` commands.
- Resume enrichment service foundation.
- Automated BDC address matching and empty-result tests.

## Required setup

The release does not contain FCC data. Download and extract the appropriate FCC BDC locations/address file and fixed availability file, then follow `docs/FCC_BDC_SETUP.md`.

## Known limitations

- Exact address matching requires a location/address file sharing the same `location_id` as the availability data.
- Browser-based background enrichment continues only while the app session is active. A future server-side Firebase Admin worker will make enrichment fully unattended.
- FCC BDC availability is provider-reported and should be described as reported availability, not guaranteed order serviceability.
