import type { Browser, BrowserContext, Page } from "@playwright/test"
import { expect } from "@playwright/test"

export const selectors = {
  peerDot: (page: Page) => page.locator(".pulse-dot").first(),
  incomingConnectionPrompt: (page: Page) =>
    page.getByText("A stranger wants to connect"),
  incomingVideoPrompt: (page: Page) => page.getByText("Start video call?"),
  acceptButton: (page: Page) => page.getByRole("button", { name: "Accept" }),
  declineButton: (page: Page) => page.getByRole("button", { name: "Decline" }),
  startVideoButton: (page: Page) => page.getByRole("button", { name: "Video" }),
  disconnectedNotice: (page: Page) =>
    page.getByText(/Stranger disconnected\.|Connection failed \(network\)\./),
}

export type Peer = { context: BrowserContext; page: Page }

export async function openPeer(
  browser: Browser,
  opts: { lat: number; lng: number },
): Promise<Peer> {
  const context = await browser.newContext({
    permissions: ["camera", "microphone", "geolocation"],
    geolocation: { latitude: opts.lat, longitude: opts.lng },
  })
  const page = await context.newPage()
  await page.goto("/")

  const enterButton = page.getByRole("button", { name: "Enter Pulse" })
  await expect(enterButton).toBeEnabled({ timeout: 30_000 })

  const joinResponse = page.waitForResponse(
    (res) =>
      res.url().includes("/api/join") && res.request().method() === "POST",
  )
  await enterButton.click()

  const res = await joinResponse
  if (!res.ok()) {
    const body = await res.text().catch(() => "<unreadable body>")
    throw new Error(`/api/join failed with status ${res.status()}: ${body}`)
  }

  return { context, page }
}

export async function connectPeers(a: Page, b: Page): Promise<void> {
  await expect(selectors.peerDot(a)).toBeVisible({ timeout: 20_000 })
  await selectors.peerDot(a).click()

  await expect(selectors.incomingConnectionPrompt(b)).toBeVisible({
    timeout: 20_000,
  })
  await selectors.acceptButton(b).click()

  await expect(selectors.startVideoButton(a)).toBeVisible({ timeout: 20_000 })
  await expect(selectors.startVideoButton(b)).toBeVisible({ timeout: 20_000 })
}

export async function startVideoCall(a: Page, b: Page): Promise<void> {
  await selectors.startVideoButton(a).click()

  await expect(selectors.incomingVideoPrompt(b)).toBeVisible({
    timeout: 20_000,
  })
  await selectors.acceptButton(b).click()

  await expect(a.getByRole("button", { name: "Mute microphone" })).toBeVisible({
    timeout: 20_000,
  })
  await expect(b.getByRole("button", { name: "Mute microphone" })).toBeVisible({
    timeout: 20_000,
  })
}

export async function hasActiveRemoteVideo(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll("video"))
    return videos.some((v) => {
      if (v.muted) return false
      const stream = v.srcObject as MediaStream | null
      const track = stream?.getVideoTracks()[0]
      return !!track && track.readyState === "live"
    })
  })
}

export async function getRemoteAudioLevel(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const videos = Array.from(document.querySelectorAll("video"))
    const remote = videos.find((v) => !v.muted && v.srcObject)
    const track = (
      remote?.srcObject as MediaStream | undefined
    )?.getAudioTracks()[0]
    if (!track) return -1

    const audioCtx = new AudioContext()
    if (audioCtx.state === "suspended") await audioCtx.resume()

    const source = audioCtx.createMediaStreamSource(new MediaStream([track]))
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)

    const data = new Uint8Array(analyser.fftSize)
    let peak = 0
    for (let i = 0; i < 20; i++) {
      analyser.getByteTimeDomainData(data)
      let sumSquares = 0
      for (const v of data) sumSquares += (v - 128) ** 2
      peak = Math.max(peak, Math.sqrt(sumSquares / data.length))
      await new Promise((r) => setTimeout(r, 50))
    }

    await audioCtx.close()
    return peak
  })
}
