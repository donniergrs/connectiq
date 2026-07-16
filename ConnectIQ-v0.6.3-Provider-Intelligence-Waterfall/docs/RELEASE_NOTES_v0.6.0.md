# ConnectIQ v0.6.0 Revenue Platform

## Included
- Provider Intelligence decision boundary with traceable diagnostics.
- Static/mock carriers can no longer become verified recommendations.
- Empty provider results remain empty; no quote is generated.
- Current carrier exclusion for verified provider results.
- Large lead imports use 100-record checkpoints and defer inline provider enrichment above 500 rows.
- Order Workspace foundation for manual DSI/carrier order tracking.
- Commission Intelligence ledger and financial status metrics.
- GitHub Actions CI and release packaging workflows.
- One-click installer, verifier, and rollback utilities.

## Important limitation
The project does not include a nationwide FCC Broadband Data Collection download. The current backend local dataset is development-only and is treated as unverified by the new recommendation boundary. A carrier is only recommended when a source is explicitly verified (FCC, DSI, or an approved carrier API).

DSI API submission is not enabled because no approved API contract or credentials were provided. The Order Workspace supports manual operational tracking until that interface is available.

## Provider Diagnostics UX Update
- Redesigned Provider Diagnostics into a responsive advisor-friendly dashboard.
- Added KPI summary cards, structured search controls, provider comparison table, recommendation summary, diagnostic details, trace timeline, and collapsible audit details.
- Preserved verified-provider-only guardrails and clearly labels unverified/static data.
