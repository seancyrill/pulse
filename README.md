# Pulse

A peer-to-peer chat and video calling app built on WebRTC, with a secure signaling layer and no media routed through a central server.

## Features

- **Text & video chat** over a direct P2P connection
- **Perfect negotiation pattern** for reliable connection setup, including glare handling and ICE candidate buffering
- **Secure signaling** — all signaling API routes are protected with server-issued, HMAC-signed tokens
- **Video call flow** with a preview stage (camera/mic check) before joining, and live mute/camera toggles that operate on the active media tracks
- **Connection health handling** — failure-counting polling with a connection trouble banner, plus disconnect/timeout detection
- **Typed message protocol** via a `WireMessage` discriminated union for signaling messages

## Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **Backend:** Node.js (API routes for signaling)
- **Real-time transport:** WebRTC (P2P audio/video/data)
- **Testing:** Vitest (unit) + Playwright (end-to-end)

## Architecture

Signaling is handled through short-lived, HMAC-signed tokens issued by the server, so peers authenticate without the server ever touching call content. Connection lifecycle — offer/answer exchange, ICE candidate buffering, renegotiation — is managed by a central `PeerSession` class that implements the perfect negotiation pattern to avoid race conditions between two peers initiating a connection at the same time.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in two browser windows/tabs to test a connection locally.

## Testing

```bash
npm run test        # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright)
```

## Status

Actively developed. Core connection security, video call flow, and test coverage are in place; ongoing work includes hardening edge cases around ICE buffering and connection error states.
