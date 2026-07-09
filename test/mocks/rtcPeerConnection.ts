import { vi } from "vitest"

export function createMockDataChannel(label: string) {
  return {
    label,
    readyState: "open" as RTCDataChannelState,
    onopen: null as (() => void) | null,
    onmessage: null as ((e: { data: string }) => void) | null,
    send: vi.fn(),
    close: vi.fn(),
  }
}

export function createMockPeerConnection() {
  const pc = {
    localDescription: null as RTCSessionDescriptionInit | null,
    remoteDescription: null as RTCSessionDescriptionInit | null,
    signalingState: "stable" as RTCSignalingState,
    connectionState: "new" as RTCPeerConnectionState,

    onicecandidate: null as
      | ((e: { candidate: RTCIceCandidateInit | null }) => void)
      | null,
    onnegotiationneeded: null as (() => void) | null,
    ontrack: null as ((e: { streams: MediaStream[] }) => void) | null,
    onconnectionstatechange: null as (() => void) | null,
    ondatachannel: null as ((e: { channel: RTCDataChannel }) => void) | null,

    setLocalDescription: vi.fn(async (desc?: RTCSessionDescriptionInit) => {
      pc.localDescription = desc ?? { type: "offer", sdp: "mock-sdp" }
    }),
    setRemoteDescription: vi.fn(async (desc: RTCSessionDescriptionInit) => {
      pc.remoteDescription = desc
      pc.signalingState = desc.type === "offer" ? "have-remote-offer" : "stable"
    }),
    addIceCandidate: vi.fn(async () => {}),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    getSenders: vi.fn(() => [] as RTCRtpSender[]),
    createDataChannel: vi.fn((label: string) => createMockDataChannel(label)),
    close: vi.fn(),
  }

  return pc as unknown as RTCPeerConnection & typeof pc
}
