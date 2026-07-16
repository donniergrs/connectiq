# ConnectIQ v0.4.0 — AI Advisor

## Business objective
Increase visitor-to-order conversion by guiding each customer through address verification, household discovery, transparent provider selection, quote review, and order creation.

## Customer journey
Address → Needs → Recommendation → Quote → Ready-to-Submit Order

## New Firestore data
The release continues writing to `leads`, `orders`, and `conversations`. Funnel events are additionally written to `conversionEvents`. Analytics failures are intentionally non-blocking.

## Known limitation
Prices and promotions remain estimates until verified through DSI or the carrier. Automatic DSI order submission is planned for v0.6.0.
