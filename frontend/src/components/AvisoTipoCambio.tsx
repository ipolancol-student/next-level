import { getTipoCambio } from '@/lib/tipoCambio';

export async function AvisoTipoCambio() {
  const tipo = await getTipoCambio();
  const tasa = tipo.quetzalesPorDolar.toFixed(5).replace(/0+$/, '');

  return (
    <p className="mt-4 text-xs leading-relaxed text-apagado">
      Precios en quetzales. Equivalente en dólares: <strong className="text-tenue">US$1 = Q{tasa}</strong>
      {tipo.fuente === 'Banguat'
        ? ` · tipo de cambio de referencia del Banco de Guatemala${tipo.fecha ? ` (${tipo.fecha})` : ''}.`
        : ' · valor aproximado (Banguat no disponible).'}
    </p>
  );
}
