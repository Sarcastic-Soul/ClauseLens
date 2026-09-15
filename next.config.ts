import type { NextConfig } from 'next'

/**
 * Response headers applied to every route.
 *
 * A share link is the only thing standing between a saved analysis and whoever
 * holds it, so the headers here are mostly about not leaking that link and not
 * letting the page be dressed up as something else.
 */
const securityHeaders = [
  /*
   * Only the framing directive. A script-src policy worth having needs a nonce
   * threaded through the App Router, and a policy loose enough to work without
   * one would allow the inline script it is meant to stop.
   */
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  /* The same rule for browsers that predate frame-ancestors. */
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  /*
   * Cross-origin requests send the origin and never the path, so a share id in
   * the URL is not handed to whatever a visitor clicks through to next.
   */
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default nextConfig
