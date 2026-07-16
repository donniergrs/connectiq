# Provider Intelligence Waterfall

ConnectIQ evaluates sources in this order:

1. Imported FCC BDC address-level repository
2. Supported/configured FCC public-data API
3. DSI qualification API (automatically skipped until configured)
4. OpenAI web research (unverified suggestions only)

## FCC National Broadband Map restriction

The captured FCC location-detail response states that unauthorized scripted or programmatic access to the Fabric is prohibited. ConnectIQ therefore does not automate `/nbm/map/api/fabric/*` endpoints. Configure `FCC_PROVIDER_LOOKUP_URL_TEMPLATE` only with an endpoint approved for public API use under the FCC API access program.

## Failure behavior

A timeout, empty result, disabled source, or source error advances to the next source. Leads are still created. AI candidates are never marked verified and cannot create a verified recommendation.
