import { beforeEach, describe, expect, it } from 'vitest';
import { borrarCarrito, guardarCarrito, leerCarrito, vaciarCacheCarritos, VIDA_MS } from './cacheCarrito';
import type { Carrito } from './tipos';

const carrito = (items_count: number) => ({ items: [], items_count }) as unknown as Carrito;

describe('caché del carrito', () => {
  beforeEach(() => vaciarCacheCarritos());

  it('devuelve el carrito guardado mientras está vigente', () => {
    guardarCarrito('token-a', carrito(2), 1000);
    expect(leerCarrito('token-a', 1000 + VIDA_MS)?.items_count).toBe(2);
  });

  it('expira después de su vida útil', () => {
    guardarCarrito('token-a', carrito(2), 1000);
    expect(leerCarrito('token-a', 1001 + VIDA_MS)).toBeNull();
  });

  it('nunca mezcla carritos de visitantes distintos', () => {
    guardarCarrito('token-a', carrito(1));
    guardarCarrito('token-b', carrito(5));
    expect(leerCarrito('token-a')?.items_count).toBe(1);
    expect(leerCarrito('token-b')?.items_count).toBe(5);
    expect(leerCarrito('token-c')).toBeNull();
  });

  it('se puede borrar (al finalizar la compra)', () => {
    guardarCarrito('token-a', carrito(1));
    borrarCarrito('token-a');
    expect(leerCarrito('token-a')).toBeNull();
  });

  it('respeta un tope de memoria descartando el más antiguo', () => {
    for (let i = 0; i <= 500; i++) guardarCarrito(`t-${i}`, carrito(i));
    expect(leerCarrito('t-0')).toBeNull();
    expect(leerCarrito('t-500')?.items_count).toBe(500);
  });
});

describe('reserva de sesiones de carrito', async () => {
  const { guardarTokenLibre, tomarTokenLibre, tokensLibres, vaciarReserva, RESERVA_MAXIMA, RESERVA_VIDA_MS } = await import('./cacheCarrito');
  beforeEach(() => vaciarReserva());

  it('entrega cada token una sola vez', () => {
    guardarTokenLibre('t1');
    guardarTokenLibre('t2');
    expect(tomarTokenLibre()).toBe('t1');
    expect(tomarTokenLibre()).toBe('t2');
    expect(tomarTokenLibre()).toBeNull();
  });

  it('no guarda más del máximo', () => {
    for (let i = 0; i < RESERVA_MAXIMA + 2; i++) guardarTokenLibre(`t${i}`);
    expect(tokensLibres()).toBe(RESERVA_MAXIMA);
  });

  it('descarta tokens viejos', () => {
    guardarTokenLibre('viejo', 0);
    guardarTokenLibre('nuevo', RESERVA_VIDA_MS);
    expect(tomarTokenLibre(RESERVA_VIDA_MS + 1)).toBe('nuevo');
  });
});
