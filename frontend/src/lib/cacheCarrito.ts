/**
 * Caché en memoria del carrito de cada visitante (por su Cart-Token), de vida corta.
 *
 * Por qué: cada llamada a WordPress tarda segundos. Al añadir, cambiar o quitar un
 * producto, WooCommerce YA devuelve el carrito actualizado; guardarlo unos segundos
 * evita volver a pedirlo al mostrar /carrito o /checkout justo después.
 *
 * Es un "mejor esfuerzo": si el servidor reinicia o la petición cae en otra instancia
 * (Vercel), simplemente no hay acierto y se consulta a WordPress como siempre.
 * Nunca se mezclan carritos: la clave es el token secreto de cada visitante.
 */
import type { Carrito } from './tipos';

export const VIDA_MS = 60_000;
const MAXIMO = 500; // tope de carritos en memoria

interface Entrada {
  carrito: Carrito;
  guardado: number;
}

const almacen = new Map<string, Entrada>();

export function guardarCarrito(token: string, carrito: Carrito, ahora = Date.now()) {
  almacen.delete(token); // reinsertar = pasa a ser el más reciente
  almacen.set(token, { carrito, guardado: ahora });
  // Al pasar el tope se descarta el más antiguo (los Map conservan el orden de inserción).
  while (almacen.size > MAXIMO) {
    almacen.delete(almacen.keys().next().value!);
  }
}

export function leerCarrito(token: string, ahora = Date.now()): Carrito | null {
  const entrada = almacen.get(token);
  if (!entrada) return null;
  if (ahora - entrada.guardado > VIDA_MS) {
    almacen.delete(token);
    return null;
  }
  return entrada.carrito;
}

export function borrarCarrito(token: string) {
  almacen.delete(token);
}

/** Solo para las pruebas. */
export function vaciarCacheCarritos() {
  almacen.clear();
}

/* ---------- Reserva de sesiones de carrito ---------- */
/*
 * Añadir el PRIMER producto exige crear antes una sesión de carrito en WooCommerce
 * (una llamada extra de varios segundos). Se mantienen unas pocas sesiones nuevas
 * ya creadas: el primer "Añadir" toma una al instante y la reposición se hace después
 * de responder. Cada token se entrega UNA sola vez, así que nadie comparte carrito.
 */
export const RESERVA_MAXIMA = 3;
export const RESERVA_VIDA_MS = 30 * 60_000; // WooCommerce los acepta 48 h; se renuevan antes

const reserva: { token: string; creado: number }[] = [];

export function guardarTokenLibre(token: string, ahora = Date.now()) {
  // Los vencidos no ocupan lugar.
  for (let i = reserva.length - 1; i >= 0; i--) {
    if (ahora - reserva[i].creado >= RESERVA_VIDA_MS) reserva.splice(i, 1);
  }
  if (reserva.length < RESERVA_MAXIMA) reserva.push({ token, creado: ahora });
}

/** Saca un token sin usar (y lo quita de la reserva), o null si no hay. */
export function tomarTokenLibre(ahora = Date.now()): string | null {
  while (reserva.length > 0) {
    const { token, creado } = reserva.shift()!;
    if (ahora - creado < RESERVA_VIDA_MS) return token;
  }
  return null;
}

export function tokensLibres(ahora = Date.now()) {
  return reserva.filter((t) => ahora - t.creado < RESERVA_VIDA_MS).length;
}

/** Solo para las pruebas. */
export function vaciarReserva() {
  reserva.length = 0;
}
