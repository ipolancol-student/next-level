/**
 * Tipo de cambio de referencia quetzal / dólar del Banco de Guatemala (Banguat).
 *
 * Banguat publica un servicio web gratuito (SOAP) que devuelve el tipo de cambio
 * del día. Con 'use cache' + cacheLife('hours') Next.js lo consulta como mucho
 * una vez por hora y reutiliza el resultado en todas las páginas.
 */
import { cacheLife, cacheTag } from 'next/cache';
import { leerTipoCambio } from './banguat';
import { env } from './env';

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
  cacheTag('tipo-cambio');

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
    const lectura = res.ok ? leerTipoCambio(await res.text()) : null;
    if (lectura) {
      cacheLife('hours');
      return { quetzalesPorDolar: lectura.referencia, fecha: lectura.fecha, fuente: 'Banguat' };
    }
  } catch {
    /* Banguat no respondió: usamos el respaldo */
  }

  // Si falló, lo guardamos poco tiempo para volver a intentarlo pronto.
  cacheLife('minutes');
  return { quetzalesPorDolar: env().TIPO_CAMBIO_RESPALDO, fecha: null, fuente: 'respaldo' };
}
