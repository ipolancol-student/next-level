import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import Link from 'next/link';
import Form from 'next/form';
import './globals.css';
import { TIENDA } from '@/lib/config';
import { ContadorCarrito } from '@/components/ContadorCarrito';
import { AvisoTipoCambio } from '@/components/AvisoTipoCambio';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: `${TIENDA.nombre} · ${TIENDA.lema}`, template: `%s · ${TIENDA.nombre}` },
  description: TIENDA.descripcion
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${inter.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col bg-neutral-50 font-sans text-neutral-900">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/95 text-white backdrop-blur">
          <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <span className="grid size-8 place-items-center rounded-lg bg-marca text-sm" aria-hidden="true">▲</span>
              {TIENDA.nombre}
            </Link>
            <ul className="hidden gap-5 text-sm text-neutral-300 sm:flex">
              <li><Link href="/tienda?categoria=videojuegos" className="hover:text-neon">Videojuegos</Link></li>
              <li><Link href="/tienda?categoria=accesorios" className="hover:text-neon">Accesorios</Link></li>
              <li><Link href="/tienda" className="hover:text-neon">Todo</Link></li>
            </ul>
            {/* <Form> de Next.js: navega a /tienda?buscar=... sin recargar la página */}
            <Form action="/tienda" className="ml-auto hidden md:block">
              <input
                type="search"
                name="buscar"
                placeholder="Buscar juegos y accesorios…"
                className="w-64 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-sm placeholder:text-neutral-400 focus:outline-2 focus:outline-marca"
              />
            </Form>
            {/* El contador lee la cookie del carrito: es dinámico, por eso va en Suspense. */}
            <Suspense fallback={<EnlaceCarrito />}>
              <ContadorCarrito />
            </Suspense>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

        <footer className="bg-neutral-950 text-neutral-400">
          <div className="mx-auto grid max-w-6xl gap-2 px-4 py-8 text-sm sm:grid-cols-2">
            <p>
              <strong className="text-white">{TIENDA.nombre}</strong> · {TIENDA.lema} · Guatemala
            </p>
            <Suspense fallback={<p className="sm:text-right">Precios en quetzales (Q).</p>}>
              <AvisoTipoCambio />
            </Suspense>
            <p className="text-xs text-neutral-500 sm:col-span-2">
              Proyecto de Seminario · WordPress headless + WooCommerce + Next.js
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

function EnlaceCarrito() {
  return (
    <Link href="/carrito" className="ml-auto rounded-full px-3 py-1.5 text-sm hover:bg-white/10 md:ml-0">
      Carrito
    </Link>
  );
}
