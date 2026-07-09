import { PeerSession } from "@/lib/webrtc"
import { describe, expect, it, vi } from "vitest"
import type { createMockPeerConnection } from "./mocks/rtcPeerConnection"

// Narrow view into PeerSession's private internals, for negotiation-state
// assertions only. Kept minimal and explicit instead of `any` so a typo'd
// field name fails at compile time instead of silently returning undefined.
type PeerSessionInternals = {
  pc: ReturnType<typeof createMockPeerConnection>
  makingOffer: boolean
  ignoreOffer: boolean
}

function internals(session: PeerSession): PeerSessionInternals {
  return session as unknown as PeerSessionInternals
}

function makeCallbacks() {
  return {
    onSignal: vi.fn(),
    onChat: vi.fn(),
    onControl: vi.fn(),
    onRemoteStream: vi.fn(),
    onConnectionState: vi.fn(),
    onChannelOpen: vi.fn(),
  }
}

describe("perfect negotiation collision", () => {
  it("polite peer accepts a colliding offer", async () => {
    const cb = makeCallbacks()
    const session = new PeerSession(false, cb)
    const { pc } = internals(session)
    internals(session).makingOffer = true

    const incomingOffer = { type: "offer", sdp: "remote-sdp" }
    await session.handleSignal("offer", JSON.stringify(incomingOffer))

    expect(internals(session).ignoreOffer).toBe(false)
    expect(pc.setRemoteDescription).toHaveBeenCalledWith(incomingOffer)
    expect(pc.setLocalDescription).toHaveBeenCalled()
    expect(cb.onSignal).toHaveBeenCalledWith("answer", expect.any(String))
  })

  it("impolite peer rejects a colliding offer", async () => {
    const cb = makeCallbacks()
    const session = new PeerSession(true, cb)
    const { pc } = internals(session)
    internals(session).makingOffer = true

    const incomingOffer = { type: "offer", sdp: "remote-sdp" }
    await session.handleSignal("offer", JSON.stringify(incomingOffer))

    expect(internals(session).ignoreOffer).toBe(true)
    expect(pc.setRemoteDescription).not.toHaveBeenCalled()
    expect(cb.onSignal).not.toHaveBeenCalledWith("answer", expect.any(String))
  })

  it("impolite peer accepts a non-colliding offer", async () => {
    const cb = makeCallbacks()
    const session = new PeerSession(true, cb)
    const { pc } = internals(session)

    const incomingOffer = { type: "offer", sdp: "remote-sdp" }
    await session.handleSignal("offer", JSON.stringify(incomingOffer))

    expect(internals(session).ignoreOffer).toBe(false)
    expect(pc.setRemoteDescription).toHaveBeenCalledWith(incomingOffer)
  })
})
