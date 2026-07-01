import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://open-invoice.com'

  const toolRoutes = [
    { url: `${baseUrl}/gst-calculator`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${baseUrl}/hsn-sac`,        lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.9 },
  ]

  const routes = [
    '',
    '/invoice-generator',
    '/estimate-generator',
    '/quotation-generator',
    '/free-invoice-software',
    '/free-estimate-software',
    '/free-quotation-software',
    '/freelancer-invoice-generator',
    '/gst-invoice-generator',
    '/privacy',
    '/terms',
    '/contact',
    '/security-compliance',
    '/gdpr',
    '/abuse',
    '/trademark',
    '/anti-spam',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }))

  return [...toolRoutes, ...routes]
}
