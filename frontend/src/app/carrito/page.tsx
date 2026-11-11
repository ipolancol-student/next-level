import Image from 'next/image';
import { Suspense } from 'react';
import Link from 'next/link';
import { getCarritoSiExiste, formatearPrecio } from '@/lib/woo';
import { actualizarAction, quitarAction } from '@/lib/acciones';
import { BloqueCargando } from '@/components/Cargando';
import { Precio } from '@/components/Precio';

export const metadata = { title: 'Carrito' };

type Busqueda = Promise<{ error?: string }>;

export default function PaginaCarrito({ searchParams }: { searchParams: Busqueda }) {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Tu carrito</h1>
      <Suspense fallback={<div className="mt-6"><BloqueCargando /></div>}>
        <ContenidoCarrito searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContenidoCarrito({ searchParams }: { searchParams: Busqueda }) {
  const { error } = await searchParams;
  const carrito = await getCarritoSiExiste();
  const items = carrito?.items ?? [];

  return (
    <>
      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {!carrito || items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <p className="text-neutral-500">Tu carrito está vacío.</p>
          <Link
            href="/tienda"
            className="mt-4 inline-block rounded-full bg-marca px-6 py-2.5 font-medium text-white hover:bg-marca-oscuro"
          >
            Ir a la tienda
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {items.map((item) => (
              <li key={item.key} className="flex gap-4 p-4">
                {item.images[0] ? (
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-lg">
                    <Image src={item.images[0].src} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                ) : (
                  <div className="size-20 shrink-0 rounded-lg bg-neutral-100" />
                )}
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="font-medium" dangerouslySetInnerHTML={{ __html: item.name }} />
                    {item.variation.length > 0 && (
                      <p className="text-sm font-medium text-marca">
                        {item.variation.map((v) => `${v.attribute}: ${v.value}`).join(' · ')}
                      </p>
                    )}
                    <p className="text-sm text-neutral-500">{formatearPrecio(item.prices.price, item.prices)} c/u</p>
                  </div>
                  {/* Formularios que llaman directo a Server Actions */}
                  <form action={actualizarAction} className="flex items-center gap-2">
                    <input type="hidden" name="key" value={item.key} />
                    <label className="sr-only" htmlFor={`cant-${item.key}`}>Cantidad</label>
                    <input
                      id={`cant-${item.key}`}
                      name="cantidad"
                      type="number"
                      min={0}
                      defaultValue={item.quantity}
                      className="w-16 rounded-lg border border-neutral-300 px-2 py-1"
                    />
                    <button className="text-sm text-marca hover:underline">Actualizar</button>
                  </form>
                  <p className="w-24 text-right font-semibold">{formatearPrecio(item.totals.line_total, item.totals)}</p>
                  <form action={quitarAction}>
                    <input type="hidden" name="key" value={item.key} />
                    <button className="text-sm text-neutral-400 hover:text-red-600" aria-label={`Quitar ${item.name}`}>✕</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="font-semibold">Resumen</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatearPrecio(carrito.totals.total_items, carrito.totals)}</dd>
              </div>
              {carrito.needs_shipping && (
                <div className="flex justify-between">
                  <dt>Envío</dt>
                  <dd>
                    {carrito.totals.total_shipping
                      ? formatearPrecio(carrito.totals.total_shipping, carrito.totals)
                      : 'Se calcula en el pago'}
                  </dd>
                </div>
              )}
              {Number(carrito.totals.total_tax) > 0 && (
                <div className="flex justify-between">
                  <dt>Impuestos</dt>
                  <dd>{formatearPrecio(carrito.totals.total_tax, carrito.totals)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="text-right">
                  <Precio monto={carrito.totals.total_price} moneda={carrito.totals} />
                </dd>
              </div>
            </dl>
            <Link
              href="/checkout"
              className="mt-5 block rounded-full bg-marca px-6 py-2.5 text-center font-medium text-white hover:bg-marca-oscuro"
            >
              Finalizar compra
            </Link>
          </aside>
        </div>
      )}
    </>
  );
}
