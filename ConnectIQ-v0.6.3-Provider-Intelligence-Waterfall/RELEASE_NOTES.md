# ConnectIQ v0.6.3 — Provider Intelligence Waterfall

## Included
- Provider waterfall: FCC BDC → official FCC public API → DSI → AI research.
- DSI automatically skips when credentials are unavailable.
- AI candidates remain unverified and cannot create verified recommendations.
- No static carrier fallback and no indefinite provider lookup.
- FCC National Broadband Map Fabric endpoints are intentionally not automated because the captured FCC response prohibits scripted access.
- Official FCC public-data lookup can be enabled with `FCC_PROVIDER_LOOKUP_URL_TEMPLATE` after obtaining the supported endpoint from FCC API documentation/access.
