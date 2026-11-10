import { formatearPrecio, type Moneda } from '@/lib/woo';
import { getTipoCambio, aDolares } from '@/lib/tipoCambio';

interface Props {
  monto: string | null | undefined;
  moneda: Moneda;
  /** Precio anterior (tachado) cuando el producto está en oferta. */
  antes?: string;
  tamano?: 'normal' | 'grande';
  className?: string;
}

/** Precio en quetzales con su equivalente en dólares debajo. */
export async function Precio({ monto, moneda, antes, tamano = 'normal', className = '' }: Props) {
  const tipo = await getTipoCambio();
  const grande = tamano === 'grande';

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span className={grande ? 'text-3xl' : ''}>
        {antes && (
          <span className={`mr-2 text-neutral-400 line-through ${grande ? 'text-lg' : 'text-sm'}`}>
            {formatearPrecio(antes, moneda)}
          </span>
        )}
        <span className="font-semibold">{formatearPrecio(monto, moneda)}</span>
      </span>
      <span className={`text-neutral-500 ${grande ? 'text-base' : 'text-xs'}`}>
        ≈ {aDolares(monto, moneda.currency_minor_unit, tipo)}
      </span>
    </span>
  );
}
