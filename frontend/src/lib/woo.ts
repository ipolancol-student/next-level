/**
 * Cliente de la WooCommerce Store API (/wp-json/wc/store/v1).
 *
 * - Todas las llamadas se hacen desde el servidor de Next.js (Server Components,
 *   Server Actions y Route Handlers), nunca desde el navegador: no hay CORS y la
 *   URL de WordPress no queda expuesta.
 * - El CATÁLOGO se guarda en caché ('use cache' + etiqueta "catalogo"). WordPress
 *   avisa a /api/revalidar cuando cambia un producto o su stock y la caché se
 *   invalida al instante (ver tienda-headless.php).
 * - El CARRITO nunca se guarda en caché: es de cada visitante y se identifica con
 *   el "Cart-Token" de WooCommerce, guardado en una cookie httpOnly.
 */
import { cookies } from 'next/headers';
import { cacheLife, cacheTag } from 'next/cache';
import { env } from './env';
import { limpiarHtml } from './producto';
import type { Carrito, Categoria, DatosCliente, EstadoPedido, Producto, ResultadoCheckout } from './tipos';

export * from './tipos';
export { formatearPrecio } from './dinero';
export { limpiarHtml, plataformaDe, categoriaPrincipal, esVideojuego, NOMBRES_PAGO } from './producto';

const CART_COOKIE = 'cart_token';
const TIEMPO_MAXIMO_MS = 15000;

export const ETIQUETA_CATALOGO = 'catalogo';

/* ---------- Errores ---------- */

export class WooError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
    this.name = 'WooError';
  }
}

/* ---------- Llamada base ---------- */

interface Opciones {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** true = enviar y guardar el Cart-Token del visitante. */
  conCarrito?: boolean;
}

function storeApi() {
  return `${env().WP_URL}/wp-json/wc/store/v1`;
}

async function storeFetch<T>(ruta: string, { method = 'GET', body, conCarrito = false }: Opciones = {}) {
  let wpUrl: string;
  try {
    wpUrl = env().WP_URL;
  } catch (e) {
    throw new WooError((e as Error).message, 0);
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';

  const almacen = conCarrito ? await cookies() : null;
  let token = almacen?.get(CART_COOKIE)?.value;

  // WooCommerce exige un "nonce" de seguridad en los POST... salvo que lleven un Cart-Token.
  // Si el visitante todavía no tiene carrito, primero pedimos uno con un GET.
  if (conCarrito && method === 'POST' && !token) {
    token = await crearCartToken();
  }
  if (token) headers['Cart-Token'] = token;

  let res: Response;
  try {
    res = await fetch(`${storeApi()}${ruta}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS)
    });
  } catch {
    throw new WooError(`No se pudo conectar con WordPress en ${wpUrl}`, 0);
  }

  // WooCommerce devuelve (o renueva) el token del carrito en cada respuesta.
  // Solo se puede guardar desde una Server Action; al mostrar una página se ignora.
  const nuevoToken = res.headers.get('Cart-Token') ?? token;
  if (almacen && nuevoToken && nuevoToken !== almacen.get(CART_COOKIE)?.value) {
    try {
      almacen.set(CART_COOKIE, nuevoToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 48 // WooCommerce expira el token a las 48 h
      });
    } catch {
      /* Server Component: no puede escribir cookies */
    }
  }

  const texto = await res.text();
  let datos: unknown = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    throw new WooError(
      'WordPress respondió algo que no es JSON. ¿Está instalado y activo WooCommerce? ¿Activaste los enlaces permanentes?',
      0
    );
  }

  if (!res.ok) {
    const mensaje = (datos as { message?: string } | null)?.message;
    throw new WooError(limpiarHtml(mensaje ?? `Error ${res.status}`), res.status);
  }

  return {
    datos: datos as T,
    totalPaginas: Number(res.headers.get('X-WP-TotalPages') ?? 1)
  };
}

/** Pide un carrito vacío a WooCommerce y devuelve su Cart-Token. */
async function crearCartToken() {
  try {
    const res = await fetch(`${storeApi()}/cart`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS)
    });
    return res.headers.get('Cart-Token') ?? undefined;
  } catch {
    return undefined; // el POST siguiente mostrará el error de conexión
  }
}

/**
 * Lecturas del catálogo en caché. Se comparten entre todos los visitantes,
 * por eso nunca usan cookies. Los errores no se guardan en caché.
 */
async function catalogoFetch<T>(ruta: string) {
  'use cache';
  cacheTag(ETIQUETA_CATALOGO);
  cacheLife('hours');
  return storeFetch<T>(ruta);
}

/* ---------- Catálogo ---------- */

export async function getProductos({
  pagina = 1,
  porPagina = 12,
  categoria,
  buscar,
  orden
}: { pagina?: number; porPagina?: number; categoria?: string; buscar?: string; orden?: 'date' | 'price' | 'popularity' } = {}) {
  const params = new URLSearchParams({ page: String(pagina), per_page: String(porPagina) });
  if (categoria) params.set('category', categoria);
  if (buscar) params.set('search', buscar);
  if (orden) {
    params.set('orderby', orden);
    params.set('order', orden === 'price' ? 'asc' : 'desc');
  }

  const { datos, totalPaginas } = await catalogoFetch<Producto[]>(`/products?${params}`);
  return { productos: datos, totalPaginas };
}

export async function getProducto(slug: string) {
  const { datos } = await catalogoFetch<Producto[]>(`/products?slug=${encodeURIComponent(slug)}`);
  return datos[0] ?? null;
}

/** Detalle de cada variación (precio, stock) de un producto variable. */
export async function getVariaciones(producto: Pick<Producto, 'variations'>) {
  const respuestas = await Promise.all(
    producto.variations.map((v) => catalogoFetch<Producto>(`/products/${v.id}`))
  );
  return respuestas.map((r) => r.datos);
}

export async function getCategorias() {
  const { datos } = await catalogoFetch<Categoria[]>('/products/categories?hide_empty=true');
  // "Sin categorizar" es la categoría por defecto de WooCommerce: no aporta en el menú.
  return datos.filter((c) => c.slug !== 'uncategorized' && c.slug !== 'sin-categorizar');
}

/** Todos los productos (para el sitemap). La Store API devuelve como máximo 100 por página. */
export async function getTodosLosProductos() {
  const primera = await catalogoFetch<Producto[]>('/products?per_page=100&page=1');
  const resto = await Promise.all(
    Array.from({ length: Math.max(0, primera.totalPaginas - 1) }, (_, i) =>
      catalogoFetch<Producto[]>(`/products?per_page=100&page=${i + 2}`)
    )
  );
  return [primera, ...resto].flatMap((r) => r.datos);
}

/* ---------- Carrito ---------- */

/** Devuelve el carrito del visitante, o null si todavía no tiene uno. */
export async function getCarritoSiExiste() {
  if (!(await cookies()).has(CART_COOKIE)) return null;
  try {
    const { datos } = await storeFetch<Carrito>('/cart', { conCarrito: true });
    return datos;
  } catch {
    return null;
  }
}

/** `id` puede ser un producto simple o una variación (p. ej. la edición de coleccionista). */
export async function agregarAlCarrito(id: number, quantity: number) {
  const { datos } = await storeFetch<Carrito>('/cart/add-item', {
    method: 'POST',
    conCarrito: true,
    body: { id, quantity }
  });
  return datos;
}

export async function actualizarItem(key: string, quantity: number) {
  const { datos } = await storeFetch<Carrito>('/cart/update-item', {
    method: 'POST',
    conCarrito: true,
    body: { key, quantity }
  });
  return datos;
}

export async function quitarItem(key: string) {
  const { datos } = await storeFetch<Carrito>('/cart/remove-item', {
    method: 'POST',
    conCarrito: true,
    body: { key }
  });
  return datos;
}

/* ---------- Checkout y pedidos ---------- */

export async function realizarPedido(cliente: DatosCliente, metodoPago: string, nota = '') {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { email, ...envio } = cliente;
  const { datos } = await storeFetch<ResultadoCheckout>('/checkout', {
    method: 'POST',
    conCarrito: true,
    body: {
      billing_address: cliente,
      shipping_address: envio,
      payment_method: metodoPago,
      customer_note: nota,
      // La pasarela de pago usa este origen para devolver al cliente a ESTA tienda
      // (WordPress solo lo acepta si está en su lista de orígenes permitidos).
      payment_data: [{ key: 'nextlevel_origen', value: env().SITE_URL }]
    }
  });
  // El pedido ya existe; empezamos un carrito nuevo.
  (await cookies()).delete(CART_COOKIE);
  return datos;
}

/**
 * Estado de un pedido desde el endpoint propio de WordPress. Requiere la clave
 * del pedido (order_key), que solo conoce quien hizo la compra. Si el pedido se
 * pagó con tarjeta, WordPress consulta a Recurrente antes de responder.
 */
export async function getEstadoPedido(id: number, clave: string): Promise<EstadoPedido | null> {
  const url = `${env().WP_URL}/wp-json/nextlevel/v1/pedidos/${id}?key=${encodeURIComponent(clave)}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS) });
  } catch {
    throw new WooError(`No se pudo conectar con WordPress en ${env().WP_URL}`, 0);
  }
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new WooError(`Error ${res.status} al consultar el pedido`, res.status);
  return (await res.json()) as EstadoPedido;
}
