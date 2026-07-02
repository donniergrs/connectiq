#!/usr/bin/env bash
set -e

echo "Applying Sprint 12: Real FCC Provider Mapping Explorer"
git checkout -B sprint-12-real-fcc-provider-mapping

mkdir -p src/pages src/services functions
cp sprint12-files/functions/index.js functions/index.js
cp sprint12-files/src/services/fccExplorerService.js src/services/fccExplorerService.js
cp sprint12-files/src/pages/FccExplorer.jsx src/pages/FccExplorer.jsx

python - <<'PY'
from pathlib import Path
p = Path('src/App.jsx')
text = p.read_text()
if 'import FccExplorer from "./pages/FccExplorer";' not in text:
    if 'import FccLookup from "./pages/FccLookup";' in text:
        text = text.replace('import FccLookup from "./pages/FccLookup";', 'import FccLookup from "./pages/FccLookup";\nimport FccExplorer from "./pages/FccExplorer";')
    else:
        text = text.replace('import Login from "./pages/Login";', 'import Login from "./pages/Login";\nimport FccExplorer from "./pages/FccExplorer";')
if '<Route path="fcc-explorer" element={<FccExplorer />} />' not in text:
    if '<Route path="fcc-lookup" element={<FccLookup />} />' in text:
        text = text.replace('<Route path="fcc-lookup" element={<FccLookup />} />', '<Route path="fcc-lookup" element={<FccLookup />} />\n          <Route path="fcc-explorer" element={<FccExplorer />} />')
    else:
        text = text.replace('<Route path="carriers" element={<CarrierDatabase />} />', '<Route path="carriers" element={<CarrierDatabase />} />\n          <Route path="fcc-explorer" element={<FccExplorer />} />')
p.write_text(text)

p = Path('src/components/Sidebar.jsx')
if p.exists():
    text = p.read_text()
    if '/admin/fcc-explorer' not in text:
        if '<NavLink to="/admin/fcc-lookup">FCC Lookup</NavLink>' in text:
            text = text.replace('<NavLink to="/admin/fcc-lookup">FCC Lookup</NavLink>', '<NavLink to="/admin/fcc-lookup">FCC Lookup</NavLink>\n        <NavLink to="/admin/fcc-explorer">FCC Explorer</NavLink>')
        elif '<NavLink to="/admin/leads">Leads</NavLink>' in text:
            text = text.replace('<NavLink to="/admin/leads">Leads</NavLink>', '<NavLink to="/admin/leads">Leads</NavLink>\n        <NavLink to="/admin/fcc-explorer">FCC Explorer</NavLink>')
    p.write_text(text)
PY

cat sprint12.css >> src/styles.css

echo "Sprint 12 files applied."
echo "Next: restart backend and frontend. Test /admin/fcc-explorer."
