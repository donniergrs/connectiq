# Mission001_v2 — ConnectIQ v0.3.0 AI Sales Foundation

## Release objective
Create a working address-to-order sales journey that uses the ConnectIQ Brain and stores a qualified, Ready-to-Submit order in Firestore.

## Included
- Corrected FCC service-to-Brain response contract
- Household discovery and personalized provider scoring
- Customer-fit and revenue-aware recommendation engine
- Contextual broadband question handling
- Structured quote generation with confirmation disclaimer
- Provider comparison display
- Marketing attribution capture from UTM parameters
- Consent-gated customer information capture
- Atomic Firestore creation of lead, order, and conversation records
- Ready-to-Submit confirmation and order reference
- Responsive Mission001_v2 UI updates

## Firestore collections written
- `leads`
- `orders`
- `conversations`

## Run locally
1. Start the backend from `functions` using the same command used for Mission001_v1.
2. From the project root run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:5173/internet`.

## Validation
- Production Vite build passes.
- Mission001_v2 source files pass ESLint.
- The repository-wide lint command still reports pre-existing issues in archived sprint folders, `functions/index.js`, and `AuthContext.jsx`; those are outside this release's changed files.

## Known limitation
The current backend `/api/fcc/lookup` prioritizes the local static FCC dataset. Addresses absent from that dataset return no verified providers. The AI sales journey intentionally does not present mock provider results as real availability.
