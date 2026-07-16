# ConnectIQ v0.6.1 — National Provider Intelligence Engine

## Purpose
Replace the runtime static-provider lookup with one provider-intelligence waterfall used by website lookups, diagnostics, and CSV lead enrichment.

## Delivered
- Live FCC lookup adapter using Census address geocoding and FCC endpoint candidates.
- Static FCC JSON is no longer used by the runtime lookup route.
- Empty FCC results remain empty; no carrier, quote, or recommendation is invented.
- Verified FCC results are normalized and are the only results eligible for recommendations.
- Current-carrier exclusion remains enforced.
- In-memory cache with configurable TTL.
- Optional sixth-source OpenAI web research for possible provider candidates when verified results are empty.
- AI candidates are visibly marked unverified and never become recommendations automatically.
- Provider Diagnostics displays AI candidates separately from verified availability.
- Lead Intake saves provider lookup status, source, and AI candidates for advisor review.
- 103 frontend/domain tests.

## Configuration
Copy values into `functions/.env`. AI research remains off until explicitly enabled.

## Important limitation
The FCC public map endpoints are not a contractual serviceability API and can change or return empty data. This release fails safely. For final order qualification, an official carrier or DSI serviceability source should be added to the same provider-source interface.
