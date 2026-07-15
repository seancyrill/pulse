import { PeerSession } from "@/lib/webrtc"
import { describe, expect, it } from "vitest"
import { internals, makeCallbacks } from "./helpers/peerSessionInternals"

describe("safeSend no-op when channel is not open", () => {
  it("sendChat does not call dc.send when channel is not open", () => {
    const cb = makeCallbacks()
    const session = new PeerSession(true, cb)
    const { dc } = internals(session)
    if (!dc) throw new Error("expected dc to be created for initiator session")

    dc.readyState = "connecting"
    session.sendChat("hello")

    expect(dc.send).not.toHaveBeenCalled()
  })

  it("sendControl does not call dc.send when channel is not open", () => {
    const cb = makeCallbacks()
    const session = new PeerSession(true, cb)
    const { dc } = internals(session)
    if (!dc) throw new Error("expected dc to be created for initiator session")

    dc.readyState = "closed"
    session.sendControl("video-request")

    expect(dc.send).not.toHaveBeenCalled()
  })

  it("sendChat does not throw when there is no data channel at all", () => {
    const cb = makeCallbacks()
    const session = new PeerSession(false, cb) // non-initiator -> no dc until ondatachannel fires
    const { dc } = internals(session)

    expect(dc).toBeNull()
    expect(() => session.sendChat("hello")).not.toThrow()
  })

  it("sendChat calls dc.send with the correct payload when channel is open", () => {
    const cb = makeCallbacks()
    const session = new PeerSession(true, cb)
    const { dc } = internals(session)
    if (!dc) throw new Error("expected dc to be created for initiator session")

    dc.readyState = "open"
    session.sendChat("hello")

    expect(dc.send).toHaveBeenCalledWith(
      JSON.stringify({ t: "msg", text: "hello" }),
    )
  })

  it("sendControl calls dc.send with the correct payload when channel is open", () => {
    const cb = makeCallbacks()
    const session = new PeerSession(true, cb)
    const { dc } = internals(session)
    if (!dc) throw new Error("expected dc to be created for initiator session")

    dc.readyState = "open"
    session.sendControl("video-accept")

    expect(dc.send).toHaveBeenCalledWith(
      JSON.stringify({ t: "ctrl", ctrl: "video-accept" }),
    )
  })
})
