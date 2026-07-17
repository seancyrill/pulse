import { issueSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Mints a session exactly the way POST /api/join does — same issueSession()
// call, same presence row shape — but skips Turnstile and the HTTP hop
// entirely. This runs in the Playwright test process (Node), which must
// share SESSION_SECRET and DATABASE_URL with the dev server started by
// webServer in playwright.config.ts, or tokens minted here won't verify.
export async function seedPeer(opts: {
  lat: number
  lng: number
  busy?: boolean
}) {
  const { id, token } = issueSession()
  await prisma.presence.create({
    data: {
      id,
      lat: opts.lat,
      lng: opts.lng,
      busy: opts.busy ?? false,
      lastSeen: new Date(),
    },
  })
  return { id, token }
}

export async function cleanupPeer(id: string) {
  await prisma.signal.deleteMany({
    where: { OR: [{ toId: id }, { fromId: id }] },
  })
  await prisma.presence.deleteMany({ where: { id } })
}
