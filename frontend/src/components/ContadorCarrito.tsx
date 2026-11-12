import Link from 'next/link';
import { cookies } from 'next/headers';
import { COOKIE_CANTIDAD } from '@/lib/woo';

/**
 * Contador del carrito en el encabezado. Lee la cantidad de una cookie que se actualiza
 * cada vez que el carrito cambia: así ninguna página espera a WordPress solo para
 * mostrar este número.
 */
export async function ContadorCarrito() {
  const valor = Number((await cookies()).get(COOKIE_CANTIDAD)?.value);
  const cantidad = Number.isInteger(valor) && valor > 0 ? valor : 0;

  return (
    <Link
      href="/carrito"
      aria-label={`Carrito, ${cantidad} productos`}
      className="relative ml-auto inline-flex items-center gap-2 rounded-xl border border-borde bg-superficie px-4 py-2 font-display text-sm font-semibold uppercase tracking-wider transition hover:border-marca md:ml-0"
    >
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H6.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="20" r="1.3" />
        <circle cx="17" cy="20" r="1.3" />
      </svg>
      <span className="hidden sm:inline">Carrito</span>
      {cantidad > 0 && (
        <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-neon text-[0.7rem] font-bold text-fondo">
          {cantidad}
        </span>
      )}
    </Link>
  );
}
