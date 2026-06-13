import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://open-invoice.com'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/', 
        '/dashboard/', 
        '/admin/', 
        '/settings/', 
        '/invoices/',
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password',
        '/verify-email'
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
