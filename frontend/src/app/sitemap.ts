/**
 * /sitemap.xml — lista de páginas para Google y otros buscadores.
 * Incluye todas las categorías y productos del catálogo (desde la caché).
 */
import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { env } from '@/lib/env';
import { getCategorias, getTodosLosProductos } from '@/lib/woo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Se genera en cada petición (con el catálogo en caché): así no se "congela" un
  // sitemap vacío si WordPress no estaba encendido al compilar.
  await connection();
  const base = env().SITE_URL;
  const fijas: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/tienda`, changeFrequency: 'daily', priority: 0.9 }
  ];

  try {
    const [categorias, productos] = await Promise.all([getCategorias(), getTodosLosProductos()]);
    return [
      ...fijas,
      ...categorias.map((c) => ({
        url: `${base}/tienda?categoria=${c.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7
      })),
      ...productos.map((p) => ({
        url: `${base}/producto/${p.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        images: p.images.map((i) => i.src)
      }))
    ];
  } catch {
    // Si WordPress no responde, al menos se publican las páginas fijas.
    return fijas;
  }
}
