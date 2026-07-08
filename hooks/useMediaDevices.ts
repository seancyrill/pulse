"use client"

import {
  enumerateMediaDevices,
  getAudioInputDeviceId,
  getVideoInputDeviceId,
  supportsAudioOutputSelection,
  type MediaDeviceOption,
} from "@/lib/media-devices"
import { useCallback, useEffect, useState } from "react"

export function useMediaDevices(localStream: MediaStream | null) {
  const [microphones, setMicrophones] = useState<MediaDeviceOption[]>([])
  const [speakers, setSpeakers] = useState<MediaDeviceOption[]>([])
  const [cameras, setCameras] = useState<MediaDeviceOption[]>([])
  const [selectedMicId, setSelectedMicId] = useState("")
  const [selectedCameraId, setSelectedCameraId] = useState("")
  const [selectedSpeakerId, setSelectedSpeakerId] = useState("")
  const [speakerSupported, setSpeakerSupported] = useState(() =>
    supportsAudioOutputSelection(),
  )

  const refresh = useCallback(async () => {
    const { microphones, speakers, cameras } = await enumerateMediaDevices()
    setMicrophones(microphones)
    setSpeakers(speakers)
    setCameras(cameras)
    setSpeakerSupported(supportsAudioOutputSelection())

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

    const activeCamera = getVideoInputDeviceId(localStream)
    if (activeCamera && cameras.some((c) => c.deviceId === activeCamera)) {
      setSelectedCameraId(activeCamera)
    } else {
      setSelectedCameraId((current) => {
        if (current && cameras.some((c) => c.deviceId === current)) {
          return current
        }
        return cameras[0]?.deviceId ?? ""
      })
    }

    setSelectedSpeakerId((current) => {
      if (current && speakers.some((s) => s.deviceId === current))
        return current
      return speakers[0]?.deviceId ?? ""
    })
  }, [localStream])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)

    const media = navigator.mediaDevices
    if (!media) {
      return () => window.clearTimeout(timer)
    }

    const handleDeviceChange = () => {
      void refresh()
    }

    media.addEventListener("devicechange", handleDeviceChange)
    return () => {
      window.clearTimeout(timer)
      media.removeEventListener("devicechange", handleDeviceChange)
    }
  }, [refresh])

  return {
    microphones,
    speakers,
    cameras,
    selectedMicId,
    setSelectedMicId,
    selectedCameraId,
    setSelectedCameraId,
    selectedSpeakerId,
    setSelectedSpeakerId,
    speakerSupported,
    refresh,
  }
}
