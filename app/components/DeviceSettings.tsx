"use client"

import type { MediaDeviceOption } from "@/lib/media-devices"

export default function DeviceSettings({
  open,
  onClose,
  microphones,
  speakers,
  cameras,
  selectedMicId,
  selectedCameraId,
  selectedSpeakerId,
  speakerSupported,
  switchingMic,
  switchingCamera,
  deviceError,
  onMicChange,
  onCameraChange,
  onSpeakerChange,
}: {
  open: boolean
  onClose: () => void
  microphones: MediaDeviceOption[]
  speakers: MediaDeviceOption[]
  cameras: MediaDeviceOption[]
  selectedMicId: string
  selectedCameraId: string
  selectedSpeakerId: string
  speakerSupported: boolean
  switchingMic: boolean
  switchingCamera: boolean
  deviceError: string | null
  onMicChange: (deviceId: string) => void
  onCameraChange: (deviceId: string) => void
  onSpeakerChange: (deviceId: string) => void
}) {
  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label="Close device settings"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      <div className="absolute bottom-24 left-1/2 z-50 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-xl backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Audio devices</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            Done
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-xs text-zinc-400">Microphone</span>
          <select
            value={selectedMicId}
            disabled={switchingMic || microphones.length === 0}
            onChange={(e) => onMicChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 disabled:opacity-50"
          >
            {microphones.length === 0 ? (
              <option value="">No microphones found</option>
            ) : (
              microphones.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-xs text-zinc-400">Camera</span>
          <select
            value={selectedCameraId}
            disabled={switchingCamera || cameras.length === 0}
            onChange={(e) => onCameraChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 disabled:opacity-50"
          >
            {cameras.length === 0 ? (
              <option value="">No cameras found</option>
            ) : (
              cameras.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs text-zinc-400">Speaker</span>
          {speakerSupported ? (
            <select
              value={selectedSpeakerId}
              disabled={speakers.length === 0}
              onChange={(e) => onSpeakerChange(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 disabled:opacity-50"
            >
              {speakers.length === 0 ? (
                <option value="">No speakers found</option>
              ) : (
                speakers.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))
              )}
            </select>
          ) : (
            <p className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-500">
              Speaker selection isn&apos;t supported in this browser.
            </p>
          )}
        </label>

        {deviceError && (
          <p className="mt-3 text-xs text-red-400">{deviceError}</p>
        )}
      </div>
    </>
  )
}
