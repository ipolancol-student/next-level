import Image from 'next/image';
import { Suspense } from 'react';
import Link from 'next/link';
import { getCarritoSiExiste, formatearPrecio, type Carrito } from '@/lib/woo';
import { limpiarHtml } from '@/lib/producto';
import { actualizarAction, quitarAction } from '@/lib/acciones';
import { BloqueCargando } from '@/components/Cargando';
import { Precio } from '@/components/Precio';

export const metadata = { title: 'Carrito' };

/** Monto mínimo para envío gratis, en centavos (debe coincidir con la zona de envío de WooCommerce). */
const ENVIO_GRATIS_DESDE = 50000;

type Busqueda = Promise<{ error?: string }>;

export default function PaginaCarrito({ searchParams }: { searchParams: Busqueda }) {
  return (
    <>
      <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-neon">Paso 1 de 2</p>
      <h1 className="mt-1 text-4xl font-bold uppercase">Tu carrito</h1>
      <Suspense fallback={<div className="mt-8"><BloqueCargando /></div>}>
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
      {error && (
        <p className="mt-6 rounded-xl border border-alerta/40 bg-alerta/10 px-4 py-3 text-sm text-alerta" role="alert">{error}</p>
      )}

      {!carrito || items.length === 0 ? (
        <div className="panel mt-8 p-12 text-center">
          <p className="font-display text-2xl font-bold uppercase">Tu carrito está vacío</p>
          <p className="mt-2 text-tenue">Explora el catálogo y encuentra tu próximo juego.</p>
          <Link href="/tienda" className="boton-primario mt-6">Ir a la tienda</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-4">
            <BarraEnvioGratis carrito={carrito} />

            <ul className="panel divide-y divide-borde">
              {items.map((item) => (
                <li key={item.key} className="flex gap-4 p-4 sm:p-5">
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-borde bg-fondo">
                    {item.images[0] ? (
                      <Image src={item.images[0].src} alt="" fill sizes="96px" className="object-cover" />
                    ) : (
                      <div className="rejilla size-full bg-linear-to-br from-marca/40 to-fondo" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <p className="font-medium">{limpiarHtml(item.name)}</p>
                      {item.variation.length > 0 && (
                        <p className="mt-0.5 font-display text-xs font-semibold uppercase tracking-wider text-neon">
                          {item.variation.map((v) => `${v.attribute}: ${v.value}`).join(' · ')}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-apagado">{formatearPrecio(item.prices.price, item.prices)} c/u</p>
                    </div>
                    {/* Formularios que llaman directo a Server Actions */}
                    <form action={actualizarAction} className="flex items-center gap-2">
                      <input type="hidden" name="key" value={item.key} />
                      <label className="sr-only" htmlFor={`cant-${item.key}`}>Cantidad de {limpiarHtml(item.name)}</label>
                      <input
                        id={`cant-${item.key}`}
                        name="cantidad"
                        type="number"
                        min={0}
                        max={99}
                        defaultValue={item.quantity}
                        className="w-16 rounded-lg border border-borde bg-fondo px-2 py-1.5 text-center font-display font-bold focus:border-marca focus:outline-none"
                      />
                      <button className="font-display text-xs font-semibold uppercase tracking-wider text-neon hover:brightness-125">Actualizar</button>
                    </form>
                    <p className="font-display text-lg font-bold sm:w-28 sm:text-right">{formatearPrecio(item.totals.line_total, item.totals)}</p>
                    <form action={quitarAction}>
                      <input type="hidden" name="key" value={item.key} />
                      <button
                        className="grid size-8 place-items-center rounded-lg text-apagado transition hover:bg-alerta/15 hover:text-alerta"
                        aria-label={`Quitar ${limpiarHtml(item.name)} del carrito`}
                      >
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/tienda" className="inline-block font-display text-sm font-semibold uppercase tracking-wider text-tenue hover:text-texto">
              ← Seguir comprando
            </Link>
          </div>

          <aside className="panel h-fit p-6 lg:sticky lg:top-32">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">Resumen</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-tenue">Subtotal ({carrito.items_count} {carrito.items_count === 1 ? 'producto' : 'productos'})</dt>
                <dd>{formatearPrecio(carrito.totals.total_items, carrito.totals)}</dd>
              </div>
              {carrito.needs_shipping && (
                <div className="flex justify-between">
                  <dt className="text-tenue">Envío</dt>
                  <dd>
                    {carrito.totals.total_shipping === null
                      ? 'Se calcula en el pago'
                      : Number(carrito.totals.total_shipping) === 0
                        ? <span className="font-semibold text-neon">Gratis</span>
                        : formatearPrecio(carrito.totals.total_shipping, carrito.totals)}
                  </dd>
                </div>
              )}
              {Number(carrito.totals.total_tax) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-tenue">Impuestos</dt>
                  <dd>{formatearPrecio(carrito.totals.total_tax, carrito.totals)}</dd>
                </div>
              )}
              <div className="flex items-start justify-between border-t border-borde pt-4">
                <dt className="font-display text-base font-bold uppercase">Total</dt>
                <dd className="text-right">
                  <Precio monto={carrito.totals.total_price} moneda={carrito.totals} />
                </dd>
              </div>
            </dl>
            <Link href="/checkout" className="boton-primario mt-6 w-full">Finalizar compra</Link>
            <p className="mt-4 text-center text-xs text-apagado">Pago seguro · Tarjeta, contra entrega o transferencia</p>
          </aside>
        </div>
      )}
    </>
  );
}

/** Barra de progreso hacia el envío gratis (motiva a completar el pedido). */
function BarraEnvioGratis({ carrito }: { carrito: Carrito }) {
  if (!carrito.needs_shipping) return null;
  const subtotal = Number(carrito.totals.total_items);
  const falta = ENVIO_GRATIS_DESDE - subtotal;
  const porcentaje = Math.min(100, Math.round((subtotal / ENVIO_GRATIS_DESDE) * 100));

  return (
    <div className="panel p-4">
      <p className="text-sm">
        {falta > 0 ? (
          <>Te faltan <strong className="text-neon">{formatearPrecio(String(falta), carrito.totals)}</strong> para el <strong>envío gratis</strong>.</>
        ) : (
          <><strong className="text-neon">¡Tienes envío gratis!</strong> Tu pedido supera Q500.</>
        )}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-fondo" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso hacia el envío gratis">
        <div className="h-full rounded-full bg-linear-to-r from-marca to-neon transition-all" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  );
}
