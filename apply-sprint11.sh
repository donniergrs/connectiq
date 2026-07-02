#!/usr/bin/env bash
set -e

echo "Applying Sprint 11: FCC Live Admin Lookup"
git checkout -B sprint-11-fcc-live-admin-lookup

mkdir -p src/pages src/services functions
cp sprint11-files/functions/index.js functions/index.js
cp sprint11-files/src/services/fccAdminService.js src/services/fccAdminService.js
cp sprint11-files/src/pages/FccLookup.jsx src/pages/FccLookup.jsx

python - <<'PY'
from pathlib import Path
p = Path('src/App.jsx')
text = p.read_text()
if 'import FccLookup from "./pages/FccLookup";' not in text:
    marker = 'import CarrierDatabase from "./pages/CarrierDatabase";'
    if marker in text:
        text = text.replace(marker, marker + '\nimport FccLookup from "./pages/FccLookup";')
    else:
        text = text.replace('import Login from "./pages/Login";', 'import Login from "./pages/Login";\nimport FccLookup from "./pages/FccLookup";')
if '<Route path="fcc-lookup" element={<FccLookup />} />' not in text:
    text = text.replace('<Route path="carriers" element={<CarrierDatabase />} />', '<Route path="carriers" element={<CarrierDatabase />} />\n          <Route path="fcc-lookup" element={<FccLookup />} />')
p.write_text(text)

p = Path('src/components/Sidebar.jsx')
if p.exists():
    text = p.read_text()
    if '/admin/fcc-lookup' not in text:
        text = text.replace('<NavLink to="/admin/leads">Leads</NavLink>', '<NavLink to="/admin/leads">Leads</NavLink>\n        <NavLink to="/admin/fcc-lookup">FCC Lookup</NavLink>')
        text = text.replace('<NavLink to="/admin/carriers">Carrier Database</NavLink>', '<NavLink to="/admin/fcc-lookup">FCC Lookup</NavLink>\n\n        <NavLink to="/admin/carriers">Carrier Database</NavLink>') if '/admin/fcc-lookup' not in text else text
    p.write_text(text)
PY

cat sprint11.css >> src/styles.css

echo "Sprint 11 files applied."
echo "Next: restart backend (functions/npm run dev) and frontend (npm run dev -- --force)."
