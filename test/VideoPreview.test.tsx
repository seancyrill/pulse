import VideoPreview from "@/app/components/VideoPreview"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

function createMockTrack(kind: "audio" | "video") {
  return {
    kind,
    enabled: true,
    stop: vi.fn(),
  } as unknown as MediaStreamTrack
}

function createMockStream() {
  const audioTrack = createMockTrack("audio")
  const videoTrack = createMockTrack("video")
  return {
    getAudioTracks: () => [audioTrack],
    getVideoTracks: () => [videoTrack],
    getTracks: () => [audioTrack, videoTrack],
    audioTrack,
    videoTrack,
  } as unknown as MediaStream & {
    audioTrack: MediaStreamTrack
    videoTrack: MediaStreamTrack
  }
}

describe("VideoPreview", () => {
  let getUserMediaMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    getUserMediaMock = vi.fn()
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: getUserMediaMock },
      writable: true,
      configurable: true,
    })
  })

  it("shows an error if getUserMedia fails", async () => {
    getUserMediaMock.mockRejectedValue(new Error("denied"))
    render(<VideoPreview onReady={vi.fn()} onCancel={vi.fn()} />)

    expect(await screen.findByText("Camera unavailable.")).toBeInTheDocument()
  })

  it("disables Ready until the stream resolves, then enables it", async () => {
    const stream = createMockStream()
    let resolveStream!: (s: MediaStream) => void
    getUserMediaMock.mockReturnValue(
      new Promise<MediaStream>((resolve) => {
        resolveStream = resolve
      }),
    )

    render(<VideoPreview onReady={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole("button", { name: "Ready" })).toBeDisabled()

    resolveStream(stream)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ready" })).toBeEnabled(),
    )
  })

  it("toggles mute by disabling the audio track, not by dropping it", async () => {
    const stream = createMockStream()
    getUserMediaMock.mockResolvedValue(stream)
    const user = userEvent.setup()
    render(<VideoPreview onReady={vi.fn()} onCancel={vi.fn()} />)

    const muteBtn = await screen.findByRole("button", {
      name: "Mute microphone",
    })
    await user.click(muteBtn)

    expect(stream.audioTrack.enabled).toBe(false)
    expect(
      screen.getByRole("button", { name: "Unmute microphone" }),
    ).toBeInTheDocument()
  })

  it("toggles camera off by disabling the video track, keeping the video element mounted", async () => {
    const stream = createMockStream()
    getUserMediaMock.mockResolvedValue(stream)
    const user = userEvent.setup()
    const { container } = render(
      <VideoPreview onReady={vi.fn()} onCancel={vi.fn()} />,
    )

    const videoEl = await waitFor(() => {
      const el = container.querySelector("video")
      expect(el).toBeTruthy()
      return el!
    })

    const camBtn = await screen.findByRole("button", {
      name: "Turn camera off",
    })
    await user.click(camBtn)

    expect(stream.videoTrack.enabled).toBe(false)
    // same DOM node — regression guard against remounting, which would
    // drop the srcObject assignment made in the getUserMedia effect
    expect(container.querySelector("video")).toBe(videoEl)
    expect(videoEl).toHaveClass("invisible")
    expect(await screen.findByText("Camera is off")).toBeInTheDocument()
  })

  it("transfers stream ownership on Ready: onReady fires and tracks are NOT stopped on unmount", async () => {
    const stream = createMockStream()
    getUserMediaMock.mockResolvedValue(stream)
    const onReady = vi.fn()
    const user = userEvent.setup()
    const { unmount } = render(
      <VideoPreview onReady={onReady} onCancel={vi.fn()} />,
    )

    const readyBtn = await screen.findByRole("button", { name: "Ready" })
    await waitFor(() => expect(readyBtn).toBeEnabled())
    await user.click(readyBtn)

    expect(onReady).toHaveBeenCalledWith(stream)

    unmount()
    expect(stream.audioTrack.stop).not.toHaveBeenCalled()
    expect(stream.videoTrack.stop).not.toHaveBeenCalled()
  })

  it("stops the stream tracks on unmount if Ready was never pressed", async () => {
    const stream = createMockStream()
    getUserMediaMock.mockResolvedValue(stream)
    const { unmount } = render(
      <VideoPreview onReady={vi.fn()} onCancel={vi.fn()} />,
    )

    await screen.findByRole("button", { name: "Ready" })
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ready" })).toBeEnabled(),
    )

    unmount()
    expect(stream.audioTrack.stop).toHaveBeenCalled()
    expect(stream.videoTrack.stop).toHaveBeenCalled()
  })

  it("stops the stream immediately if unmounted before getUserMedia resolves", async () => {
    const stream = createMockStream()
    let resolveStream!: (s: MediaStream) => void
    getUserMediaMock.mockReturnValue(
      new Promise<MediaStream>((resolve) => {
        resolveStream = resolve
      }),
    )

    const { unmount } = render(
      <VideoPreview onReady={vi.fn()} onCancel={vi.fn()} />,
    )
    unmount()
    resolveStream(stream)

    await vi.waitFor(() => {
      expect(stream.audioTrack.stop).toHaveBeenCalled()
      expect(stream.videoTrack.stop).toHaveBeenCalled()
    })
  })

  it("calls onCancel when Cancel is clicked", async () => {
    const stream = createMockStream()
    getUserMediaMock.mockResolvedValue(stream)
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<VideoPreview onReady={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalled()
  })
})
