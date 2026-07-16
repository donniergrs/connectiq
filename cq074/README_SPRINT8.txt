Sprint 8 Package - ConnectIQ Launch CRM and Carrier Intelligence

What this adds:
- Contact page now creates Firestore leads.
- Business Internet page now creates Firestore leads.
- Executive CRM dashboard with pipeline value, lead sources, top providers.
- Lead workspace with call/email actions, follow-up date, activity timeline, notes, status workflow.
- Leads CRM with source/status/search filters.
- Carrier Intelligence database with provider metadata and commission placeholders.
- Recommendation engine enriched with provider intelligence.
- Sidebar cleanup and Linux-safe AppLayout filename.

How to apply:
1. Unzip this package into C:\connectiqvscode
   You should end up with:
   C:\connectiqvscode\sprint8-files
   C:\connectiqvscode\apply-sprint8.sh

2. Open Git Bash and run:
   cd /c/connectiqvscode
   bash apply-sprint8.sh

3. Start the app:
   npm run dev -- --force

4. Test:
   http://localhost:5173/
   http://localhost:5173/business
   http://localhost:5173/contact
   http://localhost:5173/admin
   http://localhost:5173/admin/leads
   http://localhost:5173/admin/carriers

5. Commit:
   git add .
   git commit -m "Sprint 8 launch CRM and carrier intelligence"
   git push -u origin sprint-8-launch-crm

Important:
- This package does NOT include .env, node_modules, or .git.
- Keep your existing .env local only.
