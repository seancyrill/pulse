import { PeerSession } from "@/lib/webrtc"
import { describe, expect, it, vi } from "vitest"
import { internals, makeCallbacks } from "./helpers/peerSessionInternals"

function makeMockTrack(kind: "audio" | "video" = "video"): MediaStreamTrack {
  return { kind, stop: vi.fn() } as unknown as MediaStreamTrack
}

function makeMockStream(tracks: MediaStreamTrack[]): MediaStream {
  return {
    getTracks: () => tracks,
  } as unknown as MediaStream
}

describe("close() idempotency", () => {
  it("closes the data channel and peer connection on first call", () => {
    const cb = makeCallbacks()
    const session = new PeerSession(true, cb)
    const { pc } = internals(session)

    session.close()

    expect(pc.close).toHaveBeenCalledTimes(1)
  })

  it("does not close again on a second call", () => {
    const cb = makeCallbacks()
    const session = new PeerSession(true, cb)
    const { pc } = internals(session)

    session.close()
    session.close()
    session.close()

    expect(pc.close).toHaveBeenCalledTimes(1)
  })

  it("does not throw when closing a session that never attached a stream", () => {
    const cb = makeCallbacks()
    const session = new PeerSession(false, cb)

    expect(() => session.close()).not.toThrow()
  })

  it("stops local tracks on close if a stream was attached", () => {
    const cb = makeCallbacks()
    const session = new PeerSession(true, cb)
    const track = makeMockTrack("video")
    const stream = makeMockStream([track])

    session.attachStream(stream)
    session.close()

    expect(track.stop).toHaveBeenCalledTimes(1)
  })
})

describe("attachStream no-double-attach", () => {
  it("adds tracks from the stream to the peer connection", () => {
    const cb = makeCallbacks()
    const session = new PeerSession(true, cb)
    const { pc } = internals(session)
    const track = makeMockTrack("video")
    const stream = makeMockStream([track])

    session.attachStream(stream)

    expect(pc.addTrack).toHaveBeenCalledTimes(1)
    expect(pc.addTrack).toHaveBeenCalledWith(track, stream)
  })

  it("ignores a second attachStream call with a different stream", () => {
    const cb = makeCallbacks()
    const session = new PeerSession(true, cb)
    const { pc } = internals(session)

    const firstTrack = makeMockTrack("video")
    const firstStream = makeMockStream([firstTrack])
    const secondTrack = makeMockTrack("video")
    const secondStream = makeMockStream([secondTrack])

    session.attachStream(firstStream)
    session.attachStream(secondStream)

    // only the first stream's track should ever reach the peer connection
    expect(pc.addTrack).toHaveBeenCalledTimes(1)
    expect(pc.addTrack).toHaveBeenCalledWith(firstTrack, firstStream)
    expect(pc.addTrack).not.toHaveBeenCalledWith(secondTrack, secondStream)
  })

  it("is a no-op if called again with the same stream", () => {
    const cb = makeCallbacks()
    const session = new PeerSession(true, cb)
    const { pc } = internals(session)
    const track = makeMockTrack("video")
    const stream = makeMockStream([track])

    session.attachStream(stream)
    session.attachStream(stream)

    expect(pc.addTrack).toHaveBeenCalledTimes(1)
  })
})
