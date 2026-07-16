#!/usr/bin/env bash
set -e

echo "Creating Sprint 9 branch..."
git checkout -B sprint-9-advisor-platform

echo "Copying Sprint 9 files..."
cp -R sprint9-files/src/* src/

if ! grep -q "Sprint 9 Advisor Platform" src/styles.css; then
  cat sprint9.css >> src/styles.css
fi

echo "Sprint 9 applied."
echo "Run: npm run dev -- --force"
echo "Test: /admin, /admin/leads, /admin/carriers, a lead detail page"
echo "Then commit: git add . && git commit -m 'Sprint 9 advisor platform and intelligence' && git push -u origin sprint-9-advisor-platform"
