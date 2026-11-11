/**
 * Firma HMAC-SHA256 de los avisos que WordPress envía a /api/revalidar.
 *
 * WordPress firma `${timestamp}.${cuerpo}` con el secreto compartido
 * (REVALIDATE_SECRET) y manda la firma en la cabecera `x-nextlevel-firma`.
 * El timestamp evita que un aviso capturado se pueda reenviar más tarde.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export function firmar(secreto: string, timestamp: string, cuerpo: string) {
  return 'sha256=' + createHmac('sha256', secreto).update(`${timestamp}.${cuerpo}`).digest('hex');
}

interface Verificacion {
  secreto: string;
  firma: string | null;
  timestamp: string | null;
  cuerpo: string;
  /** Milisegundos (para las pruebas). */
  ahora?: number;
  toleranciaSegundos?: number;
}

export function verificarFirma({ secreto, firma, timestamp, cuerpo, ahora = Date.now(), toleranciaSegundos = 300 }: Verificacion) {
  if (!firma || !timestamp || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(ahora / 1000 - Number(timestamp)) > toleranciaSegundos) return false;

  const esperada = Buffer.from(firmar(secreto, timestamp, cuerpo));
  const recibida = Buffer.from(firma);
  // Comparación en tiempo constante: no revela cuántos caracteres coinciden.
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}
