/**
 * /pedido/123?key=wc_order_xxx — confirmación y estado de un pedido.
 *
 * La clave (order_key) la genera WooCommerce y solo la conoce quien hizo la
 * compra: sin ella no se muestra nada. Al volver de Recurrente, WordPress
 * confirma el pago con la API de Recurrente antes de responder; la redirección
 * por sí sola NUNCA se toma como prueba de pago.
 */
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEstadoPedido, type EstadoPedido } from '@/lib/woo';
import { formatearQuetzales } from '@/lib/dinero';
import { AvisoConexion } from '@/components/AvisoConexion';
import { BloqueCargando } from '@/components/Cargando';
import { RefrescoAutomatico } from '@/components/RefrescoAutomatico';

export const metadata = { title: 'Tu pedido', robots: { index: false, follow: false } };

export default function PaginaPedido({ params, searchParams }: PageProps<'/pedido/[id]'>) {
  return (
    <Suspense fallback={<BloqueCargando alto="h-80" />}>
      <DetallePedido params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const ESTADOS: Record<string, { titulo: string; texto: string; tono: 'ok' | 'espera' | 'error' }> = {
  processing: { titulo: '¡Pago recibido!', texto: 'Estamos preparando tu pedido.', tono: 'ok' },
  completed: { titulo: 'Pedido entregado', texto: 'Gracias por comprar en Next Level.', tono: 'ok' },
  'on-hold': { titulo: '¡Pedido recibido!', texto: 'Lo confirmaremos en cuanto recibamos tu pago.', tono: 'ok' },
  pending: { titulo: 'Esperando tu pago', texto: 'Estamos confirmando el pago con tu banco…', tono: 'espera' },
  failed: { titulo: 'El pago no se completó', texto: 'Tu tarjeta fue rechazada. Puedes intentar de nuevo con otra.', tono: 'error' },
  cancelled: { titulo: 'Pedido cancelado', texto: 'Este pedido fue cancelado.', tono: 'error' },
  refunded: { titulo: 'Pedido reembolsado', texto: 'El dinero fue devuelto a tu método de pago.', tono: 'error' }
};

async function DetallePedido({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, busqueda] = await Promise.all([params, searchParams]);
  const clave = typeof busqueda.key === 'string' ? busqueda.key : '';
  const pedidoId = Number(id);
  if (!Number.isInteger(pedidoId) || pedidoId <= 0 || !/^wc_order_[A-Za-z0-9]+$/.test(clave)) notFound();

  let pedido: EstadoPedido | null;
  try {
    pedido = await getEstadoPedido(pedidoId, clave);
  } catch (error) {
    return <AvisoConexion error={error} />;
  }
  if (!pedido) notFound();

  // El cliente volvió de Recurrente con 'Cancelar' y el pedido sigue sin pagar.
  const cancelado = busqueda.cancelado === '1' && pedido.estado === 'pending';
  const estado = cancelado
    ? { titulo: 'Pago cancelado', texto: 'No se hizo ningún cobro. Tu pedido sigue reservado por unos minutos.', tono: 'error' as const }
    : pedido.metodo_pago === 'cod' && pedido.estado === 'processing'
      ? { titulo: '¡Pedido recibido!', texto: 'Pagarás en efectivo o con tarjeta al recibirlo.', tono: 'ok' as const }
      : pedido.metodo_pago === 'bacs' && pedido.estado === 'on-hold'
        ? { titulo: '¡Pedido recibido!', texto: 'Te enviamos por correo los datos de la cuenta para la transferencia.', tono: 'ok' as const }
        : ESTADOS[pedido.estado] ?? { titulo: 'Pedido recibido', texto: `Estado: ${pedido.estado}`, tono: 'espera' as const };
  const color = { ok: 'bg-neon/15 text-neon ring-neon/40', espera: 'bg-marca-claro text-marca ring-marca/40', error: 'bg-alerta/15 text-alerta ring-alerta/40' }[estado.tono];
  const icono = { ok: '✓', espera: '…', error: '!' }[estado.tono];
  const esperandoTarjeta = !cancelado && pedido.estado === 'pending' && pedido.metodo_pago === 'recurrente';

  return (
    <div className="panel relative mx-auto max-w-xl overflow-hidden p-8">
      <div className="rejilla pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
      {/* Mientras Recurrente confirma el pago, la página se vuelve a consultar sola. */}
      {esperandoTarjeta && <RefrescoAutomatico cadaSegundos={3} maximo={10} />}

      <div className="relative text-center">
        <div className={`mx-auto grid size-16 place-items-center rounded-2xl font-display text-3xl font-bold ring-1 ${color}`} aria-hidden="true">
          {icono}
        </div>
        <h1 className="mt-5 text-3xl font-bold uppercase">{estado.titulo}</h1>
        <p className="mt-2 text-tenue" aria-live="polite">{estado.texto}</p>
        <p className="mt-4 font-display text-sm uppercase tracking-wider text-apagado">
          Pedido <strong className="text-texto">#{pedido.id}</strong> · {pedido.fecha}
        </p>
      </div>

      <ul className="relative mt-8 divide-y divide-borde border-y border-borde text-sm">
        {pedido.items.map((item, i) => (
          <li key={i} className="flex justify-between gap-4 py-3">
            <span>{item.nombre} × {item.cantidad}</span>
            <span className="whitespace-nowrap">{formatearQuetzales(item.total)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-tenue">Envío</dt><dd>{Number(pedido.envio) === 0 ? <span className="text-neon">Gratis</span> : formatearQuetzales(pedido.envio)}</dd></div>
        <div className="flex justify-between border-t border-borde pt-3 font-display text-xl font-bold uppercase"><dt>Total</dt><dd>{formatearQuetzales(pedido.total)}</dd></div>
        <div className="flex justify-between text-apagado"><dt>Método de pago</dt><dd>{pedido.metodo_pago_titulo}</dd></div>
      </dl>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {pedido.url_pago && (cancelado || pedido.estado === 'failed') && (
          <a href={pedido.url_pago} className="boton-neon">
            Intentar pagar de nuevo
          </a>
        )}
        <Link href="/tienda" className="boton-primario">
          Seguir comprando
        </Link>
      </div>
      <p className="mt-6 text-center text-xs text-apagado">
        Guarda este enlace para consultar el estado de tu pedido cuando quieras.
      </p>
    </div>
  );
}
