import { Suspense } from 'react';
import Link from 'next/link';

export const metadata = { title: '¡Gracias por tu compra!' };

type Busqueda = Promise<{ pedido?: string }>;

export default function Gracias({ searchParams }: { searchParams: Busqueda }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-neutral-200 bg-white p-10 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-marca-claro text-2xl text-marca" aria-hidden="true">
        ✓
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">¡Pedido recibido!</h1>
      <Suspense>
        <NumeroPedido searchParams={searchParams} />
      </Suspense>
      <p className="mt-2 text-sm text-neutral-500">Puedes verlo en WordPress, en WooCommerce → Pedidos.</p>
      <Link
        href="/tienda"
        className="mt-6 inline-block rounded-full bg-marca px-6 py-2.5 font-medium text-white hover:bg-marca-oscuro"
      >
        Seguir comprando
      </Link>
    </div>
  );
}

async function NumeroPedido({ searchParams }: { searchParams: Busqueda }) {
  const pedido = Number((await searchParams).pedido) || null;
  if (!pedido) return null;
  return (
    <p className="mt-2 text-neutral-600">
      Tu número de pedido es <strong>#{pedido}</strong>.
    </p>
  );
}
