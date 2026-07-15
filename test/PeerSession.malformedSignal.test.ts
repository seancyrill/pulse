import { PeerSession } from "@/lib/webrtc"
import { describe, expect, it, vi } from "vitest"
import { internals, makeCallbacks } from "./helpers/peerSessionInternals"

describe("malformed signal payload", () => {
  it("does not throw on invalid JSON", async () => {
    const cb = makeCallbacks()
    const session = new PeerSession(false, cb)

    await expect(
      session.handleSignal("offer", "{not valid json"),
    ).resolves.not.toThrow()
  })

  it("logs an error when the payload is malformed", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const cb = makeCallbacks()
    const session = new PeerSession(true, cb)

    await session.handleSignal("ice", "not json at all")

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("malformed signal payload"),
      expect.objectContaining({ type: "ice" }),
    )

    errorSpy.mockRestore()
  })

  it("does not mutate pc or pendingCandidates when payload is malformed", async () => {
    const cb = makeCallbacks()
    const session = new PeerSession(false, cb)
    const { pc } = internals(session)

    await session.handleSignal("ice", "{{{broken")

    expect(pc.setRemoteDescription).not.toHaveBeenCalled()
    expect(pc.addIceCandidate).not.toHaveBeenCalled()
    expect(internals(session).pendingCandidates).toEqual([])
  })

  it("does not call onSignal or emit a response when payload is malformed", async () => {
    const cb = makeCallbacks()
    const session = new PeerSession(false, cb)

    await session.handleSignal("offer", "garbage{")

    expect(cb.onSignal).not.toHaveBeenCalled()
  })

  it("recovers normally on the next valid signal after a malformed one", async () => {
    const cb = makeCallbacks()
    const session = new PeerSession(false, cb)
    const { pc } = internals(session)

    await session.handleSignal("offer", "garbage{")
    expect(pc.setRemoteDescription).not.toHaveBeenCalled()

    const validOffer = { type: "offer", sdp: "remote-sdp" }
    await session.handleSignal("offer", JSON.stringify(validOffer))

    expect(pc.setRemoteDescription).toHaveBeenCalledWith(validOffer)
  })
})
