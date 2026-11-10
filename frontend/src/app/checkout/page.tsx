import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCarritoSiExiste, formatearPrecio, NOMBRES_PAGO } from '@/lib/woo';
import { TIENDA } from '@/lib/config';
import { getTipoCambio, aDolares } from '@/lib/tipoCambio';
import { FormularioCheckout } from '@/components/FormularioCheckout';
import { BloqueCargando } from '@/components/Cargando';

export const metadata = { title: 'Finalizar compra' };

export default function PaginaCheckout() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Finalizar compra</h1>
      <Suspense fallback={<div className="mt-6"><BloqueCargando alto="h-96" /></div>}>
        <Checkout />
      </Suspense>
    </>
  );
}

async function Checkout() {
  const carrito = await getCarritoSiExiste();
  if (!carrito || carrito.items.length === 0) redirect('/carrito');

  // El formulario es un Client Component: le pasamos solo datos simples ya formateados.
  return (
    <FormularioCheckout
      paisPorDefecto={TIENDA.paisPorDefecto}
      metodos={carrito.payment_methods.map((m) => ({ id: m, nombre: NOMBRES_PAGO[m] ?? m }))}
      lineas={carrito.items.map((item) => ({
        key: item.key,
        nombre: item.name,
        cantidad: item.quantity,
        total: formatearPrecio(item.totals.line_total, item.totals)
      }))}
      envio={
        carrito.needs_shipping && carrito.totals.total_shipping !== null
          ? formatearPrecio(carrito.totals.total_shipping, carrito.totals)
          : null
      }
      total={formatearPrecio(carrito.totals.total_price, carrito.totals)}
      totalUsd={aDolares(carrito.totals.total_price, carrito.totals.currency_minor_unit, await getTipoCambio())}
    />
  );
}
