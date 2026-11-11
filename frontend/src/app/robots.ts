import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Páginas personales o sin valor para buscadores.
      disallow: ['/carrito', '/checkout', '/pedido/', '/api/']
    },
    sitemap: `${env().SITE_URL}/sitemap.xml`
  };
}
