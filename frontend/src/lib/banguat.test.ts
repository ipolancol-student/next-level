import { describe, expect, it } from 'vitest';
import { leerTipoCambio } from './banguat';

// Respuesta real del servicio TipoCambioDia del Banco de Guatemala (09/11/2026).
const RESPUESTA = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><TipoCambioDiaResponse xmlns="http://www.banguat.gob.gt/variables/ws/"><TipoCambioDiaResult><CambioDolar><VarDolar><fecha>09/11/2026</fecha><referencia>7.63807</referencia></VarDolar></CambioDolar><TotalItems>1</TotalItems></TipoCambioDiaResult></TipoCambioDiaResponse></soap:Body></soap:Envelope>`;

describe('leerTipoCambio', () => {
  it('extrae la referencia y la fecha', () => {
    expect(leerTipoCambio(RESPUESTA)).toEqual({ referencia: 7.63807, fecha: '09/11/2026' });
  });

  it('devuelve null si la respuesta no trae tipo de cambio', () => {
    expect(leerTipoCambio('<html>Servicio no disponible</html>')).toBeNull();
  });

  it('descarta valores absurdos (protección contra respuestas corruptas)', () => {
    expect(leerTipoCambio('<referencia>0</referencia>')).toBeNull();
    expect(leerTipoCambio('<referencia>7638.07</referencia>')).toBeNull();
  });
});
