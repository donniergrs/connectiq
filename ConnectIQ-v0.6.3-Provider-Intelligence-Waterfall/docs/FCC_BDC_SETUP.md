# FCC BDC Data Engine Setup

ConnectIQ v0.6.2 no longer depends on undocumented National Broadband Map endpoints. Provider Diagnostics and Lead Intake use a local SQLite database built from FCC Broadband Data Collection downloads.

## What you need from the FCC download

Prepare two extracted CSV/TSV files for the same dataset period:

1. **Locations file** with a location identifier and address fields.
2. **Fixed availability file** with the same location identifier plus provider, technology, and speed fields.

The importer recognizes common header variants automatically. The key fields are:

### Locations
- `location_id` (or `bsl_id`, `fabric_location_id`)
- `full_address`, or `address` + `city` + `state` + `zip`

### Availability
- `location_id`
- `provider_id`
- `provider_name` and/or `brand_name`
- `technology_code` or technology description
- maximum advertised download/upload speeds
- low-latency and residential/business indicators when present

If the FCC availability file only contains `location_id`, you must also obtain a permitted location file/crosswalk containing the matching address. ConnectIQ cannot reliably translate a street address to an FCC location ID from the availability file alone.

## Import command

Open PowerShell in `C:\connectiqvscode`:

```powershell
npm run fcc:import -- `
  --locations "C:\fcc-bdc\locations.csv" `
  --availability "C:\fcc-bdc\fixed-availability.csv" `
  --version "2026-06" `
  --as-of "2026-06-30"
```

The database is created at:

```text
C:\connectiqvscode\functions\data\fcc-bdc.sqlite
```

Check it with:

```powershell
npm run fcc:status
```

Then restart the backend:

```powershell
cd C:\connectiqvscode\functions
npm run dev
```

## Runtime rules

- Only providers present in the imported BDC database are marked verified.
- An empty match remains empty.
- No static or random provider is inserted.
- OpenAI research, when enabled, is shown separately as unverified and cannot create an automatic quote.
- The local BDC database is preserved during future ConnectIQ upgrades and is excluded from Git.

## Lead Intake behavior

Lead cards are created first in Firestore. Provider enrichment then runs in the background with a small concurrency limit. The import screen no longer waits for each provider lookup before creating the leads.

If the BDC database has not been imported, leads are still created and display `Provider database not loaded`. After importing the database, use the batch retry/resume function in a future admin workflow or re-run enrichment from the lead record.
