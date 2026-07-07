"use client"

import {
  enumerateMediaDevices,
  getAudioInputDeviceId,
  supportsAudioOutputSelection,
  type MediaDeviceOption,
} from "@/lib/media-devices"
import { useCallback, useEffect, useState } from "react"

export function useMediaDevices(localStream: MediaStream | null) {
  const [microphones, setMicrophones] = useState<MediaDeviceOption[]>([])
  const [speakers, setSpeakers] = useState<MediaDeviceOption[]>([])
  const [selectedMicId, setSelectedMicId] = useState("")
  const [selectedSpeakerId, setSelectedSpeakerId] = useState("")
  const [speakerSupported, setSpeakerSupported] = useState(false)

  const refresh = useCallback(async () => {
    const { microphones, speakers } = await enumerateMediaDevices()
    setMicrophones(microphones)
    setSpeakers(speakers)

    const activeMic = getAudioInputDeviceId(localStream)
    if (activeMic && microphones.some((m) => m.deviceId === activeMic)) {
      setSelectedMicId(activeMic)
    } else {
      setSelectedMicId((current) => {
        if (current && microphones.some((m) => m.deviceId === current)) {
          return current
        }
        return microphones[0]?.deviceId ?? ""
      })
    }

    setSelectedSpeakerId((current) => {
      if (current && speakers.some((s) => s.deviceId === current)) return current
      return speakers[0]?.deviceId ?? ""
    })
  }, [localStream])

  useEffect(() => {
    setSpeakerSupported(supportsAudioOutputSelection())
    void refresh()

    const media = navigator.mediaDevices
    if (!media) return

    media.addEventListener("devicechange", refresh)
    return () => media.removeEventListener("devicechange", refresh)
  }, [refresh])

  useEffect(() => {
    const activeMic = getAudioInputDeviceId(localStream)
    if (activeMic) setSelectedMicId(activeMic)
  }, [localStream])

  return {
    microphones,
    speakers,
    selectedMicId,
    setSelectedMicId,
    selectedSpeakerId,
    setSelectedSpeakerId,
    speakerSupported,
    refresh,
  }
}
