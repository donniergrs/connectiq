#!/usr/bin/env bash
set -e

echo "Applying Sprint 14A - Live FCC Provider Engine..."

git checkout -B sprint-14a-live-fcc-provider-engine

mkdir -p functions

cp sprint14_files/functions/index.js functions/index.js

echo "Sprint 14A applied."
echo "Restart backend and frontend, then test /admin/fcc-lookup."
