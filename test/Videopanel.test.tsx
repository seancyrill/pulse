import DeviceSettings from "@/app/components/DeviceSettings"
import VideoPanel from "@/app/components/VideoPanel"
import { useMediaDevices } from "@/hooks/useMediaDevices"
import { setAudioOutput } from "@/lib/media-devices"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/media-devices", () => ({
  setAudioOutput: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/hooks/useMediaDevices", () => ({
  useMediaDevices: vi.fn(),
}))

// Real DeviceSettings isn't under test here — stub it down to buttons that
// invoke the handlers VideoPanel passes in, so we can exercise the mic/
// camera/speaker switching logic without needing the real dropdown UI.
// Typed against the real component's props (import is type-only at
// compile time; vi.mock swaps the runtime binding) so the stub can't
// silently drift from VideoPanel's actual usage.
type DeviceSettingsProps = ComponentProps<typeof DeviceSettings>

vi.mock("@/app/components/DeviceSettings", () => ({
  default: (props: DeviceSettingsProps) =>
    props.open ? (
      <div data-testid="device-settings">
        <button onClick={() => props.onMicChange("mic-2")}>choose-mic-2</button>
        <button onClick={() => props.onCameraChange("cam-2")}>
          choose-cam-2
        </button>
        <button onClick={() => props.onSpeakerChange("spk-2")}>
          choose-spk-2
        </button>
        {props.switchingMic && <span>switching-mic</span>}
        {props.switchingCamera && <span>switching-camera</span>}
        {props.deviceError && <span>{props.deviceError}</span>}
      </div>
    ) : null,
}))

function createMockTrack() {
  return { enabled: true, stop: vi.fn() } as unknown as MediaStreamTrack
}

function createMockStream() {
  const audioTrack = createMockTrack()
  const videoTrack = createMockTrack()
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

type DevicesState = ReturnType<typeof useMediaDevices>

function baseDevicesReturn(): DevicesState {
  return {
    microphones: [],
    speakers: [],
    cameras: [],
    selectedMicId: "",
    setSelectedMicId: vi.fn(),
    selectedCameraId: "",
    setSelectedCameraId: vi.fn(),
    selectedSpeakerId: "",
    setSelectedSpeakerId: vi.fn(),
    speakerSupported: false,
    refresh: vi.fn().mockResolvedValue(undefined),
  }
}

describe("VideoPanel", () => {
  let devicesReturn: ReturnType<typeof baseDevicesReturn>

  beforeEach(() => {
    vi.clearAllMocks()
    devicesReturn = baseDevicesReturn()
    vi.mocked(useMediaDevices).mockReturnValue(devicesReturn)
  })

  it("shows a waiting message when there is no remote stream yet", () => {
    render(
      <VideoPanel
        localStream={null}
        remoteStream={null}
        onEnd={vi.fn()}
        onSwitchMic={vi.fn()}
        onSwitchCamera={vi.fn()}
      />,
    )
    expect(screen.getByText(/Waiting for stranger/i)).toBeInTheDocument()
  })

  it("toggles the LOCAL stream's live audio track when mute is clicked", async () => {
    const local = createMockStream()
    const user = userEvent.setup()
    render(
      <VideoPanel
        localStream={local}
        remoteStream={null}
        onEnd={vi.fn()}
        onSwitchMic={vi.fn()}
        onSwitchCamera={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Mute microphone" }))

    expect(local.audioTrack.enabled).toBe(false)
    expect(
      screen.getByRole("button", { name: "Unmute microphone" }),
    ).toBeInTheDocument()
  })

  it("toggles the LOCAL stream's live video track when camera is clicked", async () => {
    const local = createMockStream()
    const user = userEvent.setup()
    render(
      <VideoPanel
        localStream={local}
        remoteStream={null}
        onEnd={vi.fn()}
        onSwitchMic={vi.fn()}
        onSwitchCamera={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Turn camera off" }))

    expect(local.videoTrack.enabled).toBe(false)
    expect(
      screen.getByRole("button", { name: "Turn camera on" }),
    ).toBeInTheDocument()
  })

  it("no-ops mute/camera toggles when localStream is null, without throwing", async () => {
    const user = userEvent.setup()
    render(
      <VideoPanel
        localStream={null}
        remoteStream={null}
        onEnd={vi.fn()}
        onSwitchMic={vi.fn()}
        onSwitchCamera={vi.fn()}
      />,
    )
    await user.click(screen.getByRole("button", { name: "Mute microphone" }))
    // nothing to toggle, so the button stays in its original state
    expect(
      screen.getByRole("button", { name: "Mute microphone" }),
    ).toBeInTheDocument()
  })

  it("opens and closes the device settings panel, toggling aria-expanded", async () => {
    const user = userEvent.setup()
    render(
      <VideoPanel
        localStream={null}
        remoteStream={null}
        onEnd={vi.fn()}
        onSwitchMic={vi.fn()}
        onSwitchCamera={vi.fn()}
      />,
    )
    const settingsBtn = screen.getByRole("button", {
      name: "Audio device settings",
    })
    expect(settingsBtn).toHaveAttribute("aria-expanded", "false")

    await user.click(settingsBtn)
    expect(settingsBtn).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByTestId("device-settings")).toBeInTheDocument()

    await user.click(settingsBtn)
    expect(settingsBtn).toHaveAttribute("aria-expanded", "false")
  })

  it("switches microphone via device settings and updates selection", async () => {
    const onSwitchMic = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <VideoPanel
        localStream={null}
        remoteStream={null}
        onEnd={vi.fn()}
        onSwitchMic={onSwitchMic}
        onSwitchCamera={vi.fn()}
      />,
    )
    await user.click(
      screen.getByRole("button", { name: "Audio device settings" }),
    )
    await user.click(screen.getByText("choose-mic-2"))

    expect(onSwitchMic).toHaveBeenCalledWith("mic-2")
    expect(devicesReturn.setSelectedMicId).toHaveBeenCalledWith("mic-2")
  })

  it("shows a device error if switching the camera fails", async () => {
    const onSwitchCamera = vi.fn().mockRejectedValue(new Error("nope"))
    const user = userEvent.setup()
    render(
      <VideoPanel
        localStream={null}
        remoteStream={null}
        onEnd={vi.fn()}
        onSwitchMic={vi.fn()}
        onSwitchCamera={onSwitchCamera}
      />,
    )
    await user.click(
      screen.getByRole("button", { name: "Audio device settings" }),
    )
    await user.click(screen.getByText("choose-cam-2"))

    expect(
      await screen.findByText("Couldn't switch camera."),
    ).toBeInTheDocument()
  })

  it("switches the speaker directly via setAudioOutput, bypassing onSwitchMic/onSwitchCamera", async () => {
    const onSwitchMic = vi.fn()
    const onSwitchCamera = vi.fn()
    const user = userEvent.setup()
    render(
      <VideoPanel
        localStream={null}
        remoteStream={createMockStream()}
        onEnd={vi.fn()}
        onSwitchMic={onSwitchMic}
        onSwitchCamera={onSwitchCamera}
      />,
    )
    await user.click(
      screen.getByRole("button", { name: "Audio device settings" }),
    )
    await user.click(screen.getByText("choose-spk-2"))

    expect(setAudioOutput).toHaveBeenCalledWith(expect.anything(), "spk-2")
    expect(onSwitchMic).not.toHaveBeenCalled()
    expect(onSwitchCamera).not.toHaveBeenCalled()
  })

  it("calls onEnd when End video is clicked", async () => {
    const onEnd = vi.fn()
    const user = userEvent.setup()
    render(
      <VideoPanel
        localStream={null}
        remoteStream={null}
        onEnd={onEnd}
        onSwitchMic={vi.fn()}
        onSwitchCamera={vi.fn()}
      />,
    )
    await user.click(screen.getByRole("button", { name: "End video" }))
    expect(onEnd).toHaveBeenCalled()
  })
})
