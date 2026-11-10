/**
 * Cliente de la WooCommerce Store API (/wp-json/wc/store/v1).
 *
 * Es la API pública que WooCommerce usa para su propio carrito y checkout:
 * no necesita claves ni plugins extra. Todas las llamadas se hacen desde el
 * servidor de Next.js (Server Components y Server Actions), nunca desde el
 * navegador, así no hay problemas de CORS y la URL de WordPress no queda expuesta.
 *
 * El carrito de cada visitante se identifica con un "Cart-Token" que devuelve
 * WooCommerce. Lo guardamos en una cookie httpOnly llamada "cart_token".
 */
import { cookies } from 'next/headers';

export const WP_URL = (process.env.WP_URL ?? '').replace(/\/+$/, '');
const STORE_API = `${WP_URL}/wp-json/wc/store/v1`;
const CART_COOKIE = 'cart_token';

/* ---------- Tipos (solo los campos que usa la tienda) ---------- */

export interface Moneda {
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
}

export interface Imagen {
  id: number;
  src: string;
  thumbnail: string;
  alt: string;
}

export interface Categoria {
  id: number;
  name: string;
  slug: string;
  parent?: number;
  count?: number;
}

export interface Etiqueta {
  id: number;
  name: string;
  slug: string;
}

export interface Producto {
  id: number;
  name: string;
  slug: string;
  type: string;
  short_description: string;
  description: string;
  on_sale: boolean;
  prices: Moneda & { price: string; regular_price: string; sale_price: string };
  images: Imagen[];
  categories: Categoria[];
  tags: Etiqueta[];
  is_in_stock: boolean;
  is_purchasable: boolean;
  stock_availability?: { text: string };
  add_to_cart: { minimum: number; maximum: number };
}

export interface ItemCarrito {
  key: string;
  id: number;
  name: string;
  quantity: number;
  images: Imagen[];
  prices: Moneda & { price: string };
  totals: Moneda & { line_total: string };
}

export interface Carrito {
  items: ItemCarrito[];
  items_count: number;
  needs_shipping: boolean;
  payment_methods: string[];
  totals: Moneda & {
    total_items: string;
    total_shipping: string | null;
    total_tax: string;
    total_price: string;
  };
}

export interface DatosCliente {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_1: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface ResultadoCheckout {
  order_id: number;
  order_key: string;
  status: string;
  payment_result: {
    payment_status: string;
    redirect_url: string;
  };
}

/* ---------- Errores ---------- */

export class WooError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

/* ---------- Llamada base ---------- */

interface Opciones {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** true = enviar y guardar el Cart-Token del visitante. */
  conCarrito?: boolean;
}

async function storeFetch<T>(ruta: string, { method = 'GET', body, conCarrito = false }: Opciones = {}) {
  if (!WP_URL) {
    throw new WooError('Falta la variable WP_URL en el archivo .env.local', 0);
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
    res = await fetch(`${STORE_API}${ruta}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new WooError(`No se pudo conectar con WordPress en ${WP_URL}`, 0);
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
    const res = await fetch(`${STORE_API}/cart`, { headers: { Accept: 'application/json' } });
    return res.headers.get('Cart-Token') ?? undefined;
  } catch {
    return undefined; // el POST siguiente mostrará el error de conexión
  }
}

/* ---------- Catálogo ---------- */

export async function getProductos({
  pagina = 1,
  porPagina = 12,
  categoria,
  buscar
}: { pagina?: number; porPagina?: number; categoria?: string; buscar?: string } = {}) {
  const params = new URLSearchParams({ page: String(pagina), per_page: String(porPagina) });
  if (categoria) params.set('category', categoria);
  if (buscar) params.set('search', buscar);

  const { datos, totalPaginas } = await storeFetch<Producto[]>(`/products?${params}`);
  return { productos: datos, totalPaginas };
}

export async function getProducto(slug: string) {
  const { datos } = await storeFetch<Producto[]>(`/products?slug=${encodeURIComponent(slug)}`);
  return datos[0] ?? null;
}

export async function getCategorias() {
  const { datos } = await storeFetch<Categoria[]>('/products/categories?hide_empty=true');
  // "Sin categorizar" es la categoría por defecto de WooCommerce: no aporta en el menú.
  return datos.filter((c) => c.slug !== 'uncategorized' && c.slug !== 'sin-categorizar');
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

/* ---------- Checkout ---------- */

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
      customer_note: nota
    }
  });
  // El pedido ya existe; empezamos un carrito nuevo.
  (await cookies()).delete(CART_COOKIE);
  return datos;
}

/* ---------- Utilidades ---------- */

/** La Store API manda los precios en la unidad mínima ("12990" = 129,90). */
export function formatearPrecio(monto: string | null | undefined, moneda: Moneda) {
  const valor = Number(monto ?? 0) / 10 ** moneda.currency_minor_unit;
  const [entero, decimales] = valor.toFixed(moneda.currency_minor_unit).split('.');
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, moneda.currency_thousand_separator);
  const numero = decimales ? `${conMiles}${moneda.currency_decimal_separator}${decimales}` : conMiles;
  return `${moneda.currency_prefix}${numero}${moneda.currency_suffix}`;
}

export function limpiarHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Entidades numéricas que WordPress usa mucho: &#8211; (–), &#8217; (’)…
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();
}

/* ---------- Plataformas (etiquetas de producto) ---------- */

export type Plataforma = 'ps5' | 'xbox' | 'switch' | 'switch-2' | 'multiplataforma';

/** La plataforma sale de la etiqueta del producto (PS5, Xbox, Switch, Switch 2, Multiplataforma). */
export function plataformaDe(producto: Pick<Producto, 'tags'>): { id: Plataforma; nombre: string } {
  const etiqueta = producto.tags?.find((t) =>
    ['ps5', 'xbox', 'switch', 'switch-2', 'multiplataforma'].includes(t.slug)
  );
  return etiqueta
    ? { id: etiqueta.slug as Plataforma, nombre: etiqueta.name }
    : { id: 'multiplataforma', nombre: 'Multiplataforma' };
}

const CATEGORIAS_PADRE = ['videojuegos', 'accesorios'];

/** La categoría más específica (p. ej. "Controles" en vez de "Accesorios"). */
export function categoriaPrincipal(producto: Pick<Producto, 'categories'>) {
  return producto.categories.find((c) => !CATEGORIAS_PADRE.includes(c.slug)) ?? producto.categories[0];
}

export function esVideojuego(producto: Pick<Producto, 'categories'>) {
  return producto.categories.some((c) => c.slug === 'videojuegos');
}

/** Nombres legibles de los métodos de pago más comunes de WooCommerce. */
export const NOMBRES_PAGO: Record<string, string> = {
  cod: 'Pago contra entrega',
  bacs: 'Transferencia bancaria',
  cheque: 'Cheque',
  stripe: 'Tarjeta (Stripe)',
  'ppcp-gateway': 'PayPal'
};
