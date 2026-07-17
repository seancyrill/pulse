import { expect, test } from "@playwright/test"
import {
  connectPeers,
  getRemoteAudioLevel,
  hasActiveRemoteVideo,
  openPeer,
  selectors,
  startVideoCall,
  type Peer,
} from "./helpers/peers"

test.use({
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
})

test.describe.configure({ mode: "serial" })

test.describe("two-peer video call", () => {
  let peerA: Peer
  let peerB: Peer

  test.beforeAll(async ({ browser }) => {
    peerA = await openPeer(browser, { lat: 14.5995, lng: 120.9842 })
    peerB = await openPeer(browser, { lat: 14.6001, lng: 120.9838 })
    await connectPeers(peerA.page, peerB.page)
    await startVideoCall(peerA.page, peerB.page)
  })

  test.afterAll(async () => {
    await peerA.context.close().catch(() => {})
    await peerB.context.close().catch(() => {})
  })

  test("negotiates a live connection end to end", async () => {
    await expect
      .poll(() => hasActiveRemoteVideo(peerA.page), { timeout: 15_000 })
      .toBe(true)
    await expect
      .poll(() => hasActiveRemoteVideo(peerB.page), { timeout: 15_000 })
      .toBe(true)
  })

  test("muting on one side is reflected in the other peer's remote track", async () => {
    await expect
      .poll(() => getRemoteAudioLevel(peerB.page), { timeout: 10_000 })
      .toBeGreaterThan(5)

    await peerA.page.getByRole("button", { name: "Mute microphone" }).click()
    await expect
      .poll(() => getRemoteAudioLevel(peerB.page), { timeout: 10_000 })
      .toBeLessThan(2)

    await peerA.page.getByRole("button", { name: "Unmute microphone" }).click()
    await expect
      .poll(() => getRemoteAudioLevel(peerB.page), { timeout: 10_000 })
      .toBeGreaterThan(5)
  })

  test("closing one peer's tab surfaces disconnect UI for the other", async () => {
    await peerA.context.close()
    await expect(selectors.disconnectedNotice(peerB.page)).toBeVisible({
      timeout: 15_000,
    })
  })
})
