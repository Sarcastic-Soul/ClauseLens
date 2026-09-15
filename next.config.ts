import type { NextConfig } from 'next'

/**
 * Response headers applied to every route.
 *
 * A share link is the only thing standing between a saved analysis and whoever
 * holds it, so the headers here are mostly about not leaking that link and not
 * letting the page be dressed up as something else.
 */
/**
 * `script-src` carries `'unsafe-inline'` because Next.js writes its own
 * flight-data hydration script inline on every page, and blocking it without a
 * nonce means blocking the app. A nonce needs threading through Proxy on every
 * request and forces the two static pages (`/`, `/compare`) into per-request
 * rendering to get one — a real cost for a project with no
 * `dangerouslySetInnerHTML` anywhere to exploit an inline script through in the
 * first place. Every other directive is the strict value: nothing here needs a
 * plugin, a frame, an embed, or a form target off this origin.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: CSP },
  /* The same framing rule as frame-ancestors, for browsers that predate it. */
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
  /* Two years, subdomains included — long enough to submit for preload list. */
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  /* Nothing here opens a popup or shares a window with a cross-origin page. */
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  /* Nothing here is meant to be fetched as a subresource from another origin. */
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default nextConfig
