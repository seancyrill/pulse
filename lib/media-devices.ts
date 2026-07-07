import type { PeerSession } from "@/lib/webrtc"

export interface MediaDeviceOption {
  deviceId: string
  label: string
}

export function supportsAudioOutputSelection(): boolean {
  return (
    typeof HTMLMediaElement !== "undefined" &&
    "setSinkId" in HTMLMediaElement.prototype
  )
}

function labelFor(device: MediaDeviceInfo, fallback: string): string {
  return device.label.trim() || fallback
}

export async function enumerateMediaDevices(): Promise<{
  microphones: MediaDeviceOption[]
  speakers: MediaDeviceOption[]
}> {
  const devices = await navigator.mediaDevices.enumerateDevices()

  const microphones: MediaDeviceOption[] = []
  const speakers: MediaDeviceOption[] = []
  let micIndex = 0
  let speakerIndex = 0

  for (const device of devices) {
    if (device.kind === "audioinput") {
      micIndex += 1
      microphones.push({
        deviceId: device.deviceId,
        label: labelFor(device, `Microphone ${micIndex}`),
      })
    } else if (device.kind === "audiooutput") {
      speakerIndex += 1
      speakers.push({
        deviceId: device.deviceId,
        label: labelFor(device, `Speaker ${speakerIndex}`),
      })
    }
  }

  return { microphones, speakers }
}

export function getAudioInputDeviceId(
  stream: MediaStream | null,
): string | undefined {
  return stream?.getAudioTracks()[0]?.getSettings().deviceId
}

export async function switchMicrophone(
  deviceId: string,
  peerSession: PeerSession,
  localStream: MediaStream,
): Promise<MediaStream> {
  const oldTrack = localStream.getAudioTracks()[0]
  const wasEnabled = oldTrack?.enabled ?? true

  const probe = await navigator.mediaDevices.getUserMedia({
    audio: { deviceId: { exact: deviceId } },
    video: false,
  })

  const newTrack = probe.getAudioTracks()[0]
  if (!newTrack) {
    for (const track of probe.getTracks()) track.stop()
    throw new Error("no audio track from selected device")
  }

  newTrack.enabled = wasEnabled

  try {
    await peerSession.replaceAudioTrack(newTrack)
  } catch (err) {
    newTrack.stop()
    throw err
  }

  if (oldTrack) {
    localStream.removeTrack(oldTrack)
    oldTrack.stop()
  }
  localStream.addTrack(newTrack)

  for (const track of probe.getTracks()) {
    if (track !== newTrack) track.stop()
  }

  return localStream
}

export async function setAudioOutput(
  element: HTMLMediaElement,
  deviceId: string,
): Promise<void> {
  if (!supportsAudioOutputSelection()) {
    throw new Error("Audio output selection is not supported")
  }
  await element.setSinkId(deviceId)
}
