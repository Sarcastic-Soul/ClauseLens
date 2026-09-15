import type { MetadataRoute } from 'next'

/**
 * `/a/[shareId]` also carries a page-level `robots: noindex` (see
 * `app/a/[shareId]/page.tsx`), which is the real protection — a crawler that
 * ignores robots.txt still respects the meta tag. This file exists so a
 * well-behaved crawler never fetches a share URL at all.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/a/' },
  }
}
