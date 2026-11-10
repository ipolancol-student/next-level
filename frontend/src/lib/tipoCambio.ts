/**
 * Tipo de cambio de referencia quetzal / dólar del Banco de Guatemala (Banguat).
 *
 * Banguat publica un servicio web gratuito (SOAP) que devuelve el tipo de cambio
 * del día. Con 'use cache' + cacheLife('hours') Next.js lo consulta como mucho
 * una vez por hora y reutiliza el resultado en todas las páginas.
 */
import { cacheLife } from 'next/cache';
import { TIENDA } from './config';

const BANGUAT_URL = 'https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx';
const SOAP = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body><TipoCambioDia xmlns="http://www.banguat.gob.gt/variables/ws/" /></soap:Body>
</soap:Envelope>`;

export interface TipoCambio {
  /** Quetzales por 1 US$ */
  quetzalesPorDolar: number;
  /** Fecha del tipo de cambio (dd/mm/aaaa) o null si es el valor de respaldo */
  fecha: string | null;
  fuente: 'Banguat' | 'respaldo';
}

export async function getTipoCambio(): Promise<TipoCambio> {
  'use cache';

  try {
    const res = await fetch(BANGUAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '"http://www.banguat.gob.gt/variables/ws/TipoCambioDia"'
      },
      body: SOAP,
      signal: AbortSignal.timeout(8000)
    });
    const xml = await res.text();
    const referencia = Number(xml.match(/<referencia>([\d.]+)<\/referencia>/)?.[1]);
    const fecha = xml.match(/<fecha>([^<]+)<\/fecha>/)?.[1] ?? null;

    if (res.ok && referencia > 0) {
      cacheLife('hours');
      return { quetzalesPorDolar: referencia, fecha, fuente: 'Banguat' };
    }
  } catch {
    /* Banguat no respondió: usamos el respaldo */
  }

  // Si falló, lo guardamos poco tiempo para volver a intentarlo pronto.
  cacheLife('minutes');
  return { quetzalesPorDolar: TIENDA.tipoCambioRespaldo, fecha: null, fuente: 'respaldo' };
}

const formatoUsd = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Convierte un monto de la Store API (en centavos de quetzal, p. ej. "49900")
 * a dólares con formato: "US$65.33".
 */
export function aDolares(montoMinimo: string | null | undefined, unidadMinima: number, tipo: TipoCambio) {
  const quetzales = Number(montoMinimo ?? 0) / 10 ** unidadMinima;
  return `US$${formatoUsd.format(quetzales / tipo.quetzalesPorDolar)}`;
}
