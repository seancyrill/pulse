import { expect, test, type APIRequestContext } from "@playwright/test"
import { cleanupPeer, seedPeer } from "./helpers/session"

async function signal(
  request: APIRequestContext,
  token: string | null,
  body: Record<string, unknown>,
) {
  return request.post("/api/signal", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data: body,
  })
}

test.describe("POST /api/signal — HMAC token validation", () => {
  let peerA: { id: string; token: string }
  let peerB: { id: string; token: string }

  test.beforeEach(async () => {
    peerA = await seedPeer({ lat: 14.5995, lng: 120.9842 })
    peerB = await seedPeer({ lat: 14.6001, lng: 120.9838 })
  })

  test.afterEach(async () => {
    await cleanupPeer(peerA.id)
    await cleanupPeer(peerB.id)
  })

  test("rejects a request with no Authorization header", async ({
    request,
  }) => {
    const res = await signal(request, null, { toId: peerB.id, type: "request" })
    expect(res.status()).toBe(401)
    expect((await res.json()).error).toBe("unauthorized")
  })

  test("rejects a malformed token with no signature separator", async ({
    request,
  }) => {
    const res = await signal(request, "not-a-real-token", {
      toId: peerB.id,
      type: "request",
    })
    expect(res.status()).toBe(401)
  })

  test("rejects a token with a valid id but a tampered signature", async ({
    request,
  }) => {
    const tampered = `${peerA.id}.${"0".repeat(64)}`
    const res = await signal(request, tampered, {
      toId: peerB.id,
      type: "request",
    })
    expect(res.status()).toBe(401)
  })

  test("rejects a token for an id that was never issued", async ({
    request,
  }) => {
    // Same shape as a real token, but neither the id nor the signature
    // correspond to anything issueSession() actually produced — this is
    // what a forged token looks like without knowledge of SESSION_SECRET.
    const forged = `11111111-1111-1111-1111-111111111111.${"a".repeat(64)}`
    const res = await signal(request, forged, {
      toId: peerB.id,
      type: "request",
    })
    expect(res.status()).toBe(401)
  })

  test("accepts a validly-signed token and delivers the signal", async ({
    request,
  }) => {
    const res = await signal(request, peerA.token, {
      toId: peerB.id,
      type: "request",
    })
    expect(res.status()).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  test("rejects toId === fromId even with a valid token", async ({
    request,
  }) => {
    const res = await signal(request, peerA.token, {
      toId: peerA.id,
      type: "request",
    })
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toBe("cannot signal self")
  })

  test("rejects offer/ice signals when there's no active session with the target", async ({
    request,
  }) => {
    // No prior request/accept between A and B, and neither is marked busy —
    // an offer here has nothing legitimate to attach to.
    const res = await signal(request, peerA.token, {
      toId: peerB.id,
      type: "offer",
    })
    expect(res.status()).toBe(403)
    expect((await res.json()).error).toBe("no active session with target")
  })

  test("allows offer signals once a request has established a relation", async ({
    request,
  }) => {
    const requestRes = await signal(request, peerA.token, {
      toId: peerB.id,
      type: "request",
    })
    expect(requestRes.status()).toBe(200)

    const offerRes = await signal(request, peerA.token, {
      toId: peerB.id,
      type: "offer",
      payload: "v=0...",
    })
    expect(offerRes.status()).toBe(200)
  })
})
