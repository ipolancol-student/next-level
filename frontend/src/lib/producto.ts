/**
 * Reglas de negocio del catálogo (funciones puras, sin red).
 */
import type { Producto } from './tipos';

export function limpiarHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;|&rdquo;/g, '"')
    // Entidades numéricas que WordPress usa mucho: &#8211; (–), &#8217; (’)…
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();
}

/* ---------- Plataformas (etiquetas de producto) ---------- */

export type Plataforma = 'ps5' | 'xbox' | 'switch' | 'switch-2' | 'multiplataforma';
const PLATAFORMAS: Plataforma[] = ['ps5', 'xbox', 'switch', 'switch-2', 'multiplataforma'];

/** La plataforma sale de la etiqueta del producto (PS5, Xbox, Switch, Switch 2, Multiplataforma). */
export function plataformaDe(producto: Pick<Producto, 'tags'>): { id: Plataforma; nombre: string } {
  const etiqueta = producto.tags?.find((t) => PLATAFORMAS.includes(t.slug as Plataforma));
  return etiqueta
    ? { id: etiqueta.slug as Plataforma, nombre: etiqueta.name }
    : { id: 'multiplataforma', nombre: 'Multiplataforma' };
}

/** Categorías de primer nivel del catálogo (las "secciones" de la tienda). */
export const SECCIONES = [
  { slug: 'videojuegos', nombre: 'Videojuegos', tipo: 'juego' },
  { slug: 'consolas', nombre: 'Consolas', tipo: 'consola' },
  { slug: 'accesorios', nombre: 'Accesorios', tipo: 'accesorio' },
  { slug: 'tarjetas-de-regalo', nombre: 'Tarjetas de regalo', tipo: 'tarjeta' }
] as const;

export type TipoProducto = (typeof SECCIONES)[number]['tipo'];

const CATEGORIAS_PADRE: string[] = SECCIONES.map((s) => s.slug);

/** La categoría más específica (p. ej. "Controles" en vez de "Accesorios"). */
export function categoriaPrincipal(producto: Pick<Producto, 'categories'>) {
  return producto.categories.find((c) => !CATEGORIAS_PADRE.includes(c.slug)) ?? producto.categories[0];
}

/** Tipo de producto según su sección: decide el ícono, el texto de las variaciones, etc. */
export function tipoDeProducto(producto: Pick<Producto, 'categories'>): TipoProducto {
  const seccion = SECCIONES.find((s) => producto.categories.some((c) => c.slug === s.slug));
  return seccion?.tipo ?? 'accesorio';
}

export function esVideojuego(producto: Pick<Producto, 'categories'>) {
  return tipoDeProducto(producto) === 'juego';
}

/* ---------- Variaciones ---------- */

export interface OpcionVariacion {
  variacionId: number;
  /** Slug del término, p. ej. "coleccionista" */
  valor: string;
  /** Nombre visible, p. ej. "Coleccionista" */
  nombre: string;
}

/**
 * Une las variaciones del producto con los nombres de sus términos, en el orden
 * en que se crearon en WordPress (Estándar → Steelbook → Coleccionista).
 * Solo admite productos con UN atributo de variación (el caso de esta tienda).
 */
export function opcionesDeVariacion(producto: Pick<Producto, 'attributes' | 'variations'>): {
  atributo: string;
  opciones: OpcionVariacion[];
} | null {
  const atributo = producto.attributes.find((a) => a.has_variations);
  if (!atributo || producto.variations.length === 0) return null;

  const opciones = producto.variations.flatMap((v) => {
    const valor = v.attributes.find((a) => a.name === atributo.name)?.value;
    const termino = atributo.terms.find((t) => t.slug === valor);
    return valor && termino ? [{ variacionId: v.id, valor, nombre: termino.name }] : [];
  });
  return opciones.length ? { atributo: atributo.name, opciones } : null;
}

/**
 * Texto de existencias. WooCommerce en español dice "1 disponibles"; además, pocas
 * unidades se resaltan para crear urgencia de compra.
 */
export function textoStock(texto: string | undefined, quedan: number | null | undefined) {
  if (quedan === 1) return '¡Última unidad!';
  if (quedan && quedan <= 3) return `¡Solo quedan ${quedan}!`;
  return texto?.replace(/^1 disponibles$/, '1 disponible');
}

/** Nombres legibles de los métodos de pago de WooCommerce. */
export const NOMBRES_PAGO: Record<string, string> = {
  recurrente: 'Tarjeta de crédito o débito',
  cod: 'Pago contra entrega',
  bacs: 'Transferencia bancaria',
  cheque: 'Cheque'
};
