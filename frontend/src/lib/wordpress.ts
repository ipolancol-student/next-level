/**
 * Páginas de contenido de WordPress (REST API /wp-json/wp/v2), igual que en el
 * video: "Inicio", "Sobre nosotros", "Política de privacidad", etc.
 * Si tienes Yoast SEO activo, también trae el título y la descripción SEO.
 */
import { cacheLife, cacheTag } from 'next/cache';
import { env } from './env';

export interface PaginaWP {
  titulo: string;
  contenido: string;
  seo: { title?: string; description?: string };
}

export async function getPagina(slug: string): Promise<PaginaWP | null> {
  'use cache';
  cacheTag('paginas');

  try {
    const res = await fetch(`${env().WP_URL}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(15000)
    });
    if (res.ok) {
      const [pagina] = await res.json();
      cacheLife('hours'); // respuesta válida (exista o no la página)
      return pagina
        ? { titulo: pagina.title.rendered, contenido: pagina.content.rendered, seo: pagina.yoast_head_json ?? {} }
        : null;
    }
  } catch {
    /* WordPress no respondió */
  }
  // Si WordPress falló, no guardamos el "sin página" por horas: reintentamos pronto.
  cacheLife('seconds');
  return null;
}
