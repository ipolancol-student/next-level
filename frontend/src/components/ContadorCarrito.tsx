import Link from 'next/link';
import { getCarritoSiExiste } from '@/lib/woo';

export async function ContadorCarrito() {
  const carrito = await getCarritoSiExiste();
  const cantidad = carrito?.items_count ?? 0;

  return (
    <Link
      href="/carrito"
      aria-label={`Carrito, ${cantidad} productos`}
      className="relative ml-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm hover:bg-white/10 md:ml-0"
    >
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H6.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="20" r="1.3" />
        <circle cx="17" cy="20" r="1.3" />
      </svg>
      Carrito
      {cantidad > 0 && (
        <span className="rounded-full bg-neon px-2 py-0.5 text-xs font-bold text-neutral-950">{cantidad}</span>
      )}
    </Link>
  );
}
