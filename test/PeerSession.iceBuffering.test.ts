import { PeerSession } from "@/lib/webrtc"
import { describe, expect, it } from "vitest"
import { internals, makeCallbacks } from "./helpers/peerSessionInternals"

describe("ICE candidate buffering", () => {
  it("queues candidates arriving before remoteDescription is set", async () => {
    const cb = makeCallbacks()
    const session = new PeerSession(false, cb)
    const { pc } = internals(session)

    const candidate = {
      candidate: "candidate:1 mock",
      sdpMid: "0",
      sdpMLineIndex: 0,
    }
    await session.handleSignal("ice", JSON.stringify(candidate))

    expect(pc.addIceCandidate).not.toHaveBeenCalled()
    expect(internals(session).pendingCandidates).toEqual([candidate])
  })

  it("flushes queued candidates only after setRemoteDescription resolves, in order", async () => {
    const cb = makeCallbacks()
    const session = new PeerSession(false, cb)
    const { pc } = internals(session)

    const callOrder: string[] = []
    pc.setRemoteDescription.mockImplementation(
      async (desc: RTCSessionDescriptionInit) => {
        callOrder.push("setRemoteDescription")
        pc.remoteDescription = desc
        pc.signalingState =
          desc.type === "offer" ? "have-remote-offer" : "stable"
      },
    )
    pc.addIceCandidate.mockImplementation(async () => {
      callOrder.push("addIceCandidate")
    })

    const candidateA = {
      candidate: "candidate:A",
      sdpMid: "0",
      sdpMLineIndex: 0,
    }
    const candidateB = {
      candidate: "candidate:B",
      sdpMid: "0",
      sdpMLineIndex: 0,
    }

    await session.handleSignal("ice", JSON.stringify(candidateA))
    await session.handleSignal("ice", JSON.stringify(candidateB))
    expect(pc.addIceCandidate).not.toHaveBeenCalled()

    const offer = { type: "offer", sdp: "remote-sdp" }
    await session.handleSignal("offer", JSON.stringify(offer))

    expect(callOrder).toEqual([
      "setRemoteDescription",
      "addIceCandidate",
      "addIceCandidate",
    ])
    expect(pc.addIceCandidate).toHaveBeenNthCalledWith(1, candidateA)
    expect(pc.addIceCandidate).toHaveBeenNthCalledWith(2, candidateB)
    expect(internals(session).pendingCandidates).toEqual([])
  })

  it("adds candidates immediately once remoteDescription is already set", async () => {
    const cb = makeCallbacks()
    const session = new PeerSession(false, cb)
    const { pc } = internals(session)

    const offer = { type: "offer", sdp: "remote-sdp" }
    await session.handleSignal("offer", JSON.stringify(offer))

    const lateCandidate = {
      candidate: "candidate:late",
      sdpMid: "0",
      sdpMLineIndex: 0,
    }
    await session.handleSignal("ice", JSON.stringify(lateCandidate))

    expect(pc.addIceCandidate).toHaveBeenCalledWith(lateCandidate)
    expect(internals(session).pendingCandidates).toEqual([])
  })
})
