import type { PeerSession } from "@/lib/webrtc"
import { vi } from "vitest"
import type {
  createMockDataChannel,
  createMockPeerConnection,
} from "../mocks/rtcPeerConnection"

export type PeerSessionInternals = {
  pc: ReturnType<typeof createMockPeerConnection>
  dc: ReturnType<typeof createMockDataChannel> | null
  makingOffer: boolean
  ignoreOffer: boolean
  pendingCandidates: RTCIceCandidateInit[]
}

export function internals(session: PeerSession): PeerSessionInternals {
  return session as unknown as PeerSessionInternals
}

export function makeCallbacks() {
  return {
    onSignal: vi.fn(),
    onChat: vi.fn(),
    onControl: vi.fn(),
    onRemoteStream: vi.fn(),
    onConnectionState: vi.fn(),
    onChannelOpen: vi.fn(),
  }
}
