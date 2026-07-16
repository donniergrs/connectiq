#!/usr/bin/env bash
set -e

cd /c/connectiqvscode

echo "Creating Sprint 8 branch..."
git checkout -B sprint-8-launch-crm

echo "Copying Sprint 8 files..."
cp -R sprint8-files/src/* src/

# Clean duplicated legacy layout files that caused case-sensitivity issues.
rm -f src/Applayout.jsx
rm -f src/layouts/Applayout.jsx

echo "Sprint 8 files applied."
echo "Run: npm run dev -- --force"
echo "Test: /, /business, /contact, /admin, /admin/leads, /admin/carriers"
echo "Then commit: git add . && git commit -m 'Sprint 8 launch CRM and carrier intelligence' && git push -u origin sprint-8-launch-crm"
