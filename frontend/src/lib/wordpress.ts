/**
 * Páginas de contenido de WordPress (REST API /wp-json/wp/v2), igual que en el
 * video: "Inicio", "Sobre nosotros", "Política de privacidad", etc.
 * Si tienes Yoast SEO activo, también trae el título y la descripción SEO.
 */
import { WP_URL } from './woo';

export interface PaginaWP {
  titulo: string;
  contenido: string;
  seo: { title?: string; description?: string };
}

export async function getPagina(slug: string): Promise<PaginaWP | null> {
  if (!WP_URL) return null;
  try {
    const res = await fetch(`${WP_URL}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const [pagina] = await res.json();
    if (!pagina) return null;
    return {
      titulo: pagina.title.rendered,
      contenido: pagina.content.rendered,
      seo: pagina.yoast_head_json ?? {}
    };
  } catch {
    return null;
  }
}
