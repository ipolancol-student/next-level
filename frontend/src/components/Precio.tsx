import type { Moneda } from '@/lib/tipos';
import { formatearPrecio, aDolares } from '@/lib/dinero';
import { getTipoCambio } from '@/lib/tipoCambio';

interface Props {
  monto: string | null | undefined;
  moneda: Moneda;
  /** Precio anterior (tachado) cuando el producto está en oferta. */
  antes?: string;
  /** "Desde Q499.00" para productos con variaciones. */
  desde?: boolean;
  tamano?: 'normal' | 'grande';
  className?: string;
}

/** Precio en quetzales con su equivalente en dólares debajo. */
export async function Precio({ monto, moneda, antes, desde, tamano = 'normal', className = '' }: Props) {
  const { quetzalesPorDolar } = await getTipoCambio();
  const grande = tamano === 'grande';

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span className={`flex flex-wrap items-baseline gap-x-2 font-display ${grande ? 'text-4xl' : 'text-xl'}`}>
        {desde && <span className="font-sans text-xs font-normal uppercase tracking-wider text-apagado">Desde</span>}
        <span className="font-bold text-texto">{formatearPrecio(monto, moneda)}</span>
        {antes && (
          <span className={`text-apagado line-through ${grande ? 'text-lg' : 'text-sm'}`}>{formatearPrecio(antes, moneda)}</span>
        )}
      </span>
      <span className={`text-apagado ${grande ? 'text-base' : 'text-xs'}`}>
        ≈ {aDolares(monto, moneda.currency_minor_unit, quetzalesPorDolar)}
      </span>
    </span>
  );
}
