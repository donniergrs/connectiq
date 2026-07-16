# ConnectIQ Release 5.0.5 RC1 — Provider Intelligence Audit

This cumulative audit package adds an internal Provider Diagnostics page and the first Provider Intelligence service boundary. It exposes the current fallback risk without yet migrating all production lookup traffic.

## Included

- `/admin/provider-diagnostics`
- Provider trace IDs and timelines
- Unified provider normalization
- Verified-provider-only recommendation guardrails
- Current-carrier exclusion
- Static fallback detection
- Provider dependency inventory
- Architecture Decision Records
- 7 new regression tests
- Audit and migration documentation

Read `PROVIDER_INTELLIGENCE_AUDIT.md` before RC2 implementation.
