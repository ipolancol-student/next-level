import { describe, expect, it } from 'vitest';
import { firmar, verificarFirma } from './firma';

const SECRETO = 'secreto-de-prueba-de-32-caracteres!!';
const CUERPO = '{"etiquetas":["catalogo"]}';
const AHORA = 1_794_300_000_000; // ms
const TS = String(AHORA / 1000);

describe('firma HMAC de /api/revalidar', () => {
  it('acepta una firma correcta y reciente', () => {
    const firma = firmar(SECRETO, TS, CUERPO);
    expect(verificarFirma({ secreto: SECRETO, firma, timestamp: TS, cuerpo: CUERPO, ahora: AHORA })).toBe(true);
  });

  it('coincide byte a byte con la firma que genera WordPress (hash_hmac en PHP)', () => {
    // Valor obtenido ejecutando en WordPress:
    // 'sha256=' . hash_hmac('sha256', '1794300000.{"etiquetas":["catalogo"]}', 'secreto-de-prueba-de-32-caracteres!!')
    expect(firmar(SECRETO, TS, CUERPO)).toBe('sha256=8c917f48b7e72481f77919900d7dc5eb4b8bdb8a46567b8cf406da8ce79d5463');
  });

  it('rechaza un cuerpo modificado', () => {
    const firma = firmar(SECRETO, TS, CUERPO);
    expect(verificarFirma({ secreto: SECRETO, firma, timestamp: TS, cuerpo: '{"etiquetas":["paginas"]}', ahora: AHORA })).toBe(false);
  });

  it('rechaza otro secreto', () => {
    const firma = firmar('otro-secreto-de-32-caracteres-xxxx', TS, CUERPO);
    expect(verificarFirma({ secreto: SECRETO, firma, timestamp: TS, cuerpo: CUERPO, ahora: AHORA })).toBe(false);
  });

  it('rechaza avisos de hace más de 5 minutos (reenvío de un aviso capturado)', () => {
    const viejo = String(AHORA / 1000 - 301);
    const firma = firmar(SECRETO, viejo, CUERPO);
    expect(verificarFirma({ secreto: SECRETO, firma, timestamp: viejo, cuerpo: CUERPO, ahora: AHORA })).toBe(false);
  });

  it('rechaza cabeceras faltantes o mal formadas', () => {
    expect(verificarFirma({ secreto: SECRETO, firma: null, timestamp: TS, cuerpo: CUERPO, ahora: AHORA })).toBe(false);
    expect(verificarFirma({ secreto: SECRETO, firma: 'sha256=abc', timestamp: 'ayer', cuerpo: CUERPO, ahora: AHORA })).toBe(false);
  });
});
