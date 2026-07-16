# Changelog

## 0.4.0 — AI Advisor

- Added a state-driven customer sales journey.
- Added a unified customer session for future web, voice, and SMS channels.
- Added household priority and budget discovery.
- Added explainable recommendation scoring and confidence.
- Added Provider Cards v2 with strengths, tradeoffs, and selection.
- Added personalized quote review.
- Added progressive customer contact capture.
- Added non-blocking Firestore conversion event tracking.
- Preserved FCC lookup, order creation, lead creation, and conversation persistence.

## 0.6.1
- Replaced static runtime FCC availability with the Provider Intelligence waterfall.
- Added live FCC lookup, safe empty-result handling, cache, and optional AI research candidates.
- Added source/status fields to imported lead enrichment.
- Added Provider Diagnostics AI-candidate presentation.
- Expanded automated tests to 103.

## 0.6.2
- Added SQLite FCC BDC data repository and flexible CSV/TSV ingestion.
- Removed undocumented FCC map endpoints from the default provider lookup path.
- Changed Lead Intake to create Firestore lead cards before enrichment.
- Added background provider enrichment, checkpointing, explicit missing-database status, and resume service foundation.
- Added BDC status/version reporting and 4 automated repository tests.

## 0.6.3
- Added deterministic FCC → DSI → AI provider waterfall.
- Added DSI adapter and configuration flags.
- Replaced guessed FCC endpoint fan-out with a single supported/configured public API adapter.
- Disabled scripted Fabric access.
- Added waterfall ordering tests.
