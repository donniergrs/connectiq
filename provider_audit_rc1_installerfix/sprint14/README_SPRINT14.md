# ConnectIQ Sprint 14A — Live FCC Provider Engine

This package replaces the fallback provider engine with the FCC web fabric API flow we reverse engineered from the public Broadband Map.

## What changed

- Backend now uses:
  - `/nbm/map/api/fabric/address/{fabricId}/{address}`
  - `/nbm/map/api/fabric/detail/{fabricId}/{locationId}?fabric_vintage=2025-12-31`
- Provider rows now include real FCC data:
  - brand/provider name
  - holding company
  - technology
  - max download/upload
  - FRN
  - provider ID
  - residential/business flag
  - low latency flag
- FCC Lookup admin page now displays live providers.

## Apply

```bash
cd /c/connectiqvscode
bash apply-sprint14.sh
```

## Run

Terminal 1:
```bash
cd /c/connectiqvscode/functions
npm run dev
```

Terminal 2:
```bash
cd /c/connectiqvscode
npm run dev -- --force
```

## Test

- http://localhost:5001/api/fcc/diagnostic
- http://localhost:5173/admin/fcc-lookup

Use:
`101 Plum Creek Ln Greenville SC 29607`

Expected live providers include AT&T, Spectrum, WOW, Starlink, Verizon, etc. depending on the current FCC response.
