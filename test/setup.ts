import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"
import { createMockPeerConnection } from "./mocks/rtcPeerConnection"

vi.stubGlobal(
  "RTCPeerConnection",
  vi.fn(function () {
    return createMockPeerConnection() as unknown as RTCPeerConnection
  }),
)
