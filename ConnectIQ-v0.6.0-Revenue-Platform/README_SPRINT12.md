# Sprint 12 — Real FCC Provider Mapping Explorer

This sprint adds a safe FCC endpoint explorer so ConnectIQ can test live provider endpoint candidates without breaking the working CRM or advisor lookup flow.

## Adds

- `/api/fcc/explore` backend endpoint
- `/admin/fcc-explorer` admin page
- Candidate endpoint testing with timeout protection
- Provider-row extraction if a candidate endpoint returns provider arrays
- Raw preview viewer for debugging FCC responses
- Keeps `/api/fcc/lookup` safe by falling back instead of breaking

## Apply

```bash
cd /c/connectiqvscode
bash apply-sprint12.sh
npm run dev -- --force
```

In a second terminal:

```bash
cd /c/connectiqvscode/functions
npm run dev
```

Test:

- http://localhost:5001/api/fcc/diagnostic
- http://localhost:5173/admin/fcc-explorer
- http://localhost:5173/admin/fcc-lookup

Commit:

```bash
git add .
git commit -m "Sprint 12 add FCC provider endpoint explorer"
git push -u origin sprint-12-real-fcc-provider-mapping
```
