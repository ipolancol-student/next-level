/**
 * Lectura de la respuesta SOAP del Banco de Guatemala (TipoCambioDia).
 * Función pura: se prueba sin red en banguat.test.ts.
 */

export interface LecturaBanguat {
  /** Quetzales por 1 US$ */
  referencia: number;
  /** dd/mm/aaaa */
  fecha: string | null;
}

export function leerTipoCambio(xml: string): LecturaBanguat | null {
  const referencia = Number(xml.match(/<referencia>\s*([\d.]+)\s*<\/referencia>/)?.[1]);
  // Rango de seguridad: un valor fuera de esto es un error de lectura, no un tipo de cambio real.
  if (!Number.isFinite(referencia) || referencia < 1 || referencia > 100) return null;
  const fecha = xml.match(/<fecha>\s*([^<]+?)\s*<\/fecha>/)?.[1] ?? null;
  return { referencia, fecha };
}
