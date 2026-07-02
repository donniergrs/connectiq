#!/usr/bin/env bash
set -e

echo "Applying Sprint 14A Live FCC Provider Engine..."

git checkout -B sprint-14-live-fcc-provider-engine
mkdir -p functions/services src/pages src/services

cp sprint14/functions/index.js functions/index.js
cp sprint14/functions/services/liveFccService.js functions/services/liveFccService.js
cp sprint14/src/pages/FccLookup.jsx src/pages/FccLookup.jsx
cp sprint14/src/services/fccAdminService.js src/services/fccAdminService.js

cat >> src/styles.css <<'CSS'

/* Sprint 14 live FCC provider engine */
.compact-recommendation {
  margin: 28px 0;
  padding: 26px;
}
.compact-recommendation h3 {
  color: white;
}
.fcc-summary-strip {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  margin: 22px 0;
}
.fcc-summary-strip div {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
}
.fcc-summary-strip strong {
  display: block;
  color: #64748b;
  font-size: 13px;
  margin-bottom: 8px;
}
.fcc-summary-strip span {
  color: #0f172a;
  font-size: 24px;
  font-weight: 950;
}
@media (max-width: 1000px) {
  .fcc-summary-strip { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 650px) {
  .fcc-summary-strip { grid-template-columns: 1fr; }
}
CSS

echo "Sprint 14A applied."
