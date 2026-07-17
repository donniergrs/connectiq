# AI-004A Conversation Runtime Foundation

## Collections
- `conversationSessions`: current resumable session state
- `conversations`: conversation-level index and status
- `conversationEvents`: ordered customer, AI, system, and tool events

## API
- `GET /api/conversations/health`
- `POST /api/conversations/sessions`
- `GET /api/conversations/sessions/:sessionId`
- `PATCH /api/conversations/sessions/:sessionId`
- `POST /api/conversations/sessions/:sessionId/resume`
- `POST /api/conversations/sessions/:sessionId/pause`
- `POST /api/conversations/sessions/:sessionId/events`
- `GET /api/conversations/sessions/:sessionId/events`

The Express runtime maintains active local sessions during development. The React runtime mirrors session and event data into Firestore, providing durable storage and a channel-neutral data model for website chat and ElevenLabs.
