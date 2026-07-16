#!/usr/bin/env bash
set -e

echo "Applying Sprint 16A - Static FCC Carrier Recommendation Database..."

mkdir -p functions/data functions/services
cp sprint16a_files/functions/data/fccStaticAvailability.json functions/data/fccStaticAvailability.json
cp sprint16a_files/functions/services/staticFccAvailability.js functions/services/staticFccAvailability.js

python - <<'PY'
from pathlib import Path

p = Path("functions/index.js")
text = p.read_text(encoding="utf-8", errors="ignore")

import_line = 'import { lookupStaticFccAvailability, getStaticFccStatus } from "./services/staticFccAvailability.js";\n'
if import_line not in text:
    marker = 'import fetch from "node-fetch";\n'
    if marker in text:
        text = text.replace(marker, marker + import_line)
    else:
        text = import_line + text

status_route = '''\napp.get("/api/fcc/static-status", (req, res) => {\n  res.json(getStaticFccStatus());\n});\n\n'''
if 'app.get("/api/fcc/static-status"' not in text:
    text = text.replace('app.post("/api/fcc/lookup"', status_route + 'app.post("/api/fcc/lookup"')

start = text.find('app.post("/api/fcc/lookup"')
if start == -1:
    raise SystemExit('Could not find /api/fcc/lookup route in functions/index.js')

listen = text.find('\napp.listen(PORT', start)
if listen == -1:
    raise SystemExit('Could not find app.listen after /api/fcc/lookup route')

new_lookup = '''app.post("/api/fcc/lookup", async (req, res) => {\n  const address = req.body?.address || req.body?.street || req.body?.full || "";\n\n  try {\n    const staticResult = lookupStaticFccAvailability(address);\n\n    if (staticResult.ok && staticResult.providers?.length) {\n      return res.json(staticResult);\n    }\n\n    return res.json({\n      ok: true,\n      source: "connectiq-no-static-match",\n      message: "No local FCC static record matched this address yet. Add this location to functions/data/fccStaticAvailability.json from the FCC export.",\n      address,\n      providerCount: 0,\n      providers: [],\n      notes: [\n        staticResult.message || "No static FCC match found.",\n        "The FCC website detail endpoint requires browser session cookies, so ConnectIQ now uses a stable local FCC static dataset.",\n        "Add this address/location to the static FCC dataset to return real provider recommendations."\n      ],\n      staticStatus: staticResult.status || getStaticFccStatus(),\n    });\n  } catch (error) {\n    console.error("Static FCC lookup failed:", error);\n    return res.status(500).json({\n      ok: false,\n      source: "fcc-static-error",\n      message: error.message || "Static FCC lookup failed.",\n      address,\n      providerCount: 0,\n      providers: [],\n      notes: [error.message || "Unknown static FCC lookup error"],\n    });\n  }\n});\n'''

text = text[:start] + new_lookup + text[listen:]
p.write_text(text, encoding="utf-8")
PY

echo "Sprint 16A applied. Restart backend and frontend."
echo "Test: http://localhost:5001/api/fcc/static-status"
echo "Then test /admin/fcc-lookup with: 101 Plum Creek Ln Greenville SC 29607"
