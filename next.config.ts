import type { NextConfig } from "next"

const localIp = process.env.LOCAL_DEV_IP || ""
const httpsDev = process.env.HTTPS_DEV || ""

const nextConfig: NextConfig = {
  allowedDevOrigins: [localIp, httpsDev],
}

export default nextConfig
