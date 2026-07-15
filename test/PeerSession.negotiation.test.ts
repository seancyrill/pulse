import { PeerSession } from "@/lib/webrtc"
import { describe, expect, it } from "vitest"
import { internals, makeCallbacks } from "./helpers/peerSessionInternals"

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
