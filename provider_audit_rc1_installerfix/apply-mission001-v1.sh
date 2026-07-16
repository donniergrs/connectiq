#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"

if [ ! -f "$ROOT/package.json" ] || [ ! -d "$ROOT/src" ]; then
  echo "Run this script from the ConnectIQ project root, for example:"
  echo "  cd /c/connectiqvscode"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/mission001-backup-$STAMP"
mkdir -p "$BACKUP/src/pages" "$BACKUP/src/services/brain"

for file in \
  src/pages/InternetAdvisor.jsx \
  src/services/brain/brain.js \
  src/services/brain/conversationEngine.js \
  src/services/brain/conversationState.js \
  src/services/brain/recommendationEngine.js \
  src/services/brain/knowledgeBase.js \
  src/services/brain/quoteEngine.js \
  src/services/brain/orderEngine.js
do
  if [ -f "$ROOT/$file" ]; then
    mkdir -p "$BACKUP/$(dirname "$file")"
    cp "$ROOT/$file" "$BACKUP/$file"
  fi
done

cp -R mission001_files/src/pages/InternetAdvisor.jsx "$ROOT/src/pages/InternetAdvisor.jsx"
mkdir -p "$ROOT/src/services/brain"
cp -R mission001_files/src/services/brain/. "$ROOT/src/services/brain/"

python - <<'PY'
from pathlib import Path
import re

root = Path.cwd()
app = root / "src/App.jsx"

if not app.exists():
    raise SystemExit("src/App.jsx was not found.")

text = app.read_text(encoding="utf-8", errors="ignore")

import_line = 'import InternetAdvisor from "./pages/InternetAdvisor";'
if import_line not in text:
    imports = list(re.finditer(r'^import .*?;\s*$', text, flags=re.M))
    if not imports:
        raise SystemExit("Could not locate imports in src/App.jsx.")
    pos = imports[-1].end()
    text = text[:pos] + "\n" + import_line + text[pos:]

route = '<Route path="/internet" element={<InternetAdvisor />} />'
if route not in text:
    routes_match = re.search(r'<Routes[^>]*>', text)
    if not routes_match:
        raise SystemExit("Could not locate <Routes> in src/App.jsx.")
    pos = routes_match.end()
    text = text[:pos] + "\n        " + route + text[pos:]

app.write_text(text, encoding="utf-8")

styles = root / "src/styles.css"
css = (root / "mission001_styles.css").read_text(encoding="utf-8")
marker = "/* Mission 001 v1 — Autonomous Sales Funnel */"

existing = styles.read_text(encoding="utf-8", errors="ignore") if styles.exists() else ""
if marker not in existing:
    styles.write_text(existing.rstrip() + "\n\n" + css.strip() + "\n", encoding="utf-8")
PY

cp README_MISSION001_V1.md "$ROOT/README_MISSION001_V1.md"
cp CHANGELOG_MISSION001_V1.md "$ROOT/CHANGELOG_MISSION001_V1.md"
cp KNOWN_ISSUES_MISSION001_V1.md "$ROOT/KNOWN_ISSUES_MISSION001_V1.md"

echo
echo "Mission 001 v1 installed."
echo "Backup: $BACKUP"
echo
echo "Next:"
echo "  npm run dev -- --force"
echo
echo "Open:"
echo "  http://localhost:5173/internet"
