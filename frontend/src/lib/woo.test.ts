/**
 * Pruebas del cliente de la Store API con un fetch simulado: no hace falta WordPress.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Simulación de las cookies de Next.js ---
const galleta = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (galleta.has(n) ? { name: n, value: galleta.get(n)! } : undefined),
    has: (n: string) => galleta.has(n),
    set: (n: string, v: string) => void galleta.set(n, v),
    delete: (n: string) => void galleta.delete(n)
  })
}));
// cacheTag / cacheLife solo tienen efecto dentro de Next.js.
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {} }));

const respuesta = (cuerpo: unknown, init: { status?: number; headers?: Record<string, string> } = {}) =>
  new Response(JSON.stringify(cuerpo), { status: init.status ?? 200, headers: init.headers });

describe('cliente de la Store API', () => {
  beforeEach(() => {
    galleta.clear();
    vi.stubEnv('WP_URL', 'http://wp.test');
    vi.resetModules();
  });

  it('sin carrito, pide un Cart-Token antes del POST (evita el error de nonce) y lo guarda en la cookie', async () => {
    const fetchSimulado = vi
      .fn()
      .mockResolvedValueOnce(respuesta({}, { headers: { 'Cart-Token': 'token-nuevo' } })) // GET /cart
      .mockResolvedValueOnce(respuesta({ items: [], items_count: 1 }, { headers: { 'Cart-Token': 'token-nuevo' } }));
    vi.stubGlobal('fetch', fetchSimulado);

    const { agregarAlCarrito } = await import('./woo');
    await agregarAlCarrito(102, 1);

    const [urlGet] = fetchSimulado.mock.calls[0];
    const [urlPost, opcionesPost] = fetchSimulado.mock.calls[1];
    expect(urlGet).toBe('http://wp.test/wp-json/wc/store/v1/cart');
    expect(urlPost).toBe('http://wp.test/wp-json/wc/store/v1/cart/add-item');
    expect(opcionesPost.headers['Cart-Token']).toBe('token-nuevo');
    expect(JSON.parse(opcionesPost.body)).toEqual({ id: 102, quantity: 1 });
    expect(galleta.get('cart_token')).toBe('token-nuevo');
  });

  it('reutiliza el token existente sin pedir otro', async () => {
    galleta.set('cart_token', 'token-viejo');
    const fetchSimulado = vi.fn().mockResolvedValueOnce(respuesta({ items: [] }));
    vi.stubGlobal('fetch', fetchSimulado);

    const { quitarItem } = await import('./woo');
    await quitarItem('abc');

    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    expect(fetchSimulado.mock.calls[0][1].headers['Cart-Token']).toBe('token-viejo');
  });

  it('convierte los errores de WooCommerce en mensajes legibles', async () => {
    galleta.set('cart_token', 't');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        respuesta({ code: 'woocommerce_rest_product_out_of_stock', message: 'No puedes añadir &quot;Metroid Dread&quot;: agotado.' }, { status: 400 })
      )
    );
    const { agregarAlCarrito, WooError } = await import('./woo');
    const error = await agregarAlCarrito(1, 1).catch((e) => e);
    expect(error).toBeInstanceOf(WooError);
    expect(error.status).toBe(400);
    expect(error.message).toBe('No puedes añadir "Metroid Dread": agotado.');
  });

  it('distingue "WordPress apagado" (status 0) de un error de la API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    const { getProducto } = await import('./woo');
    const error = await getProducto('x').catch((e) => e);
    expect(error.status).toBe(0);
    expect(error.message).toContain('http://wp.test');
  });

  it('getProductos arma los parámetros de búsqueda y lee el total de páginas', async () => {
    const fetchSimulado = vi.fn().mockResolvedValueOnce(respuesta([], { headers: { 'X-WP-TotalPages': '4' } }));
    vi.stubGlobal('fetch', fetchSimulado);
    const { getProductos } = await import('./woo');

    const { totalPaginas } = await getProductos({ pagina: 2, categoria: 'playstation-5', buscar: 'god', orden: 'price' });

    const url = new URL(fetchSimulado.mock.calls[0][0]);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '2', per_page: '12', category: 'playstation-5', search: 'god', orderby: 'price', order: 'asc'
    });
    expect(totalPaginas).toBe(4);
  });
});
