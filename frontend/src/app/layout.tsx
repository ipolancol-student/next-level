import type { Metadata, Viewport } from 'next';
import { Chakra_Petch, Inter } from 'next/font/google';
import { Suspense } from 'react';
import Link from 'next/link';
import Form from 'next/form';
import './globals.css';
import { TIENDA } from '@/lib/config';
import { env } from '@/lib/env';
import { SECCIONES } from '@/lib/producto';
import { ContadorCarrito } from '@/components/ContadorCarrito';
import { AvisoTipoCambio } from '@/components/AvisoTipoCambio';
import { Logo } from '@/components/Logo';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
// Tipografía "display" para títulos, precios y botones: da la identidad gamer.
const chakra = Chakra_Petch({ variable: '--font-chakra', subsets: ['latin'], weight: ['500', '600', '700'] });

export const viewport: Viewport = { themeColor: '#0b0b14', colorScheme: 'dark' };

export function generateMetadata(): Metadata {
  let base: URL | undefined;
  try {
    base = new URL(env().SITE_URL);
  } catch {
    /* sin SITE_URL válido: las URLs absolutas se omiten */
  }
  return {
    metadataBase: base,
    title: { default: `${TIENDA.nombre} · ${TIENDA.lema}`, template: `%s · ${TIENDA.nombre}` },
    description: TIENDA.descripcion,
    applicationName: TIENDA.nombre,
    openGraph: { type: 'website', siteName: TIENDA.nombre, locale: 'es_GT' },
    twitter: { card: 'summary_large_image' }
  };
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${inter.variable} ${chakra.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 boton-neon">
          Saltar al contenido
        </a>

        {/* Barra de anuncios */}
        <div className="bg-linear-to-r from-marca via-marca-oscuro to-marca text-center font-display text-xs font-semibold uppercase tracking-widest text-white">
          <p className="px-4 py-2">Envío gratis en compras desde Q500 · Pago seguro con tarjeta · Productos nuevos y sellados</p>
        </div>

        <header className="sticky top-0 z-20 border-b border-borde bg-fondo/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
            <Link href="/" aria-label={`${TIENDA.nombre}, inicio`}>
              <Logo />
            </Link>

            {/* <Form> de Next.js: navega a /tienda?buscar=... sin recargar la página */}
            <Form action="/tienda" className="relative ml-auto hidden max-w-md flex-1 md:block" role="search">
              <svg className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-apagado" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                name="buscar"
                aria-label="Buscar productos"
                placeholder="Buscar juegos, consolas, accesorios…"
                className="w-full rounded-xl border border-borde bg-superficie py-2 pl-9 pr-4 text-sm placeholder:text-apagado focus:border-marca focus:outline-none"
              />
            </Form>

            {/* El contador lee la cookie del carrito: es dinámico, por eso va en Suspense. */}
            <Suspense fallback={<EnlaceCarrito />}>
              <ContadorCarrito />
            </Suspense>
          </div>

          <nav aria-label="Secciones" className="border-t border-borde">
            <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 font-display text-sm font-semibold uppercase tracking-wider [scrollbar-width:none]">
              {SECCIONES.map((s) => (
                <li key={s.slug} className="shrink-0">
                  <Link href={`/tienda?categoria=${s.slug}`} className="block px-3 py-2.5 text-tenue transition hover:text-texto">
                    {s.nombre}
                  </Link>
                </li>
              ))}
              <li className="shrink-0">
                <Link href="/tienda?ofertas=1" className="block px-3 py-2.5 text-neon transition hover:brightness-125">
                  Ofertas
                </Link>
              </li>
            </ul>
          </nav>
        </header>

        <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
          {children}
        </main>

        <footer className="mt-16 border-t border-borde bg-superficie/40">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo />
              <p className="mt-4 text-sm text-tenue">{TIENDA.descripcion}</p>
            </div>
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-widest text-apagado">Tienda</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {SECCIONES.map((s) => (
                  <li key={s.slug}><Link href={`/tienda?categoria=${s.slug}`} className="text-tenue hover:text-texto">{s.nombre}</Link></li>
                ))}
                <li><Link href="/tienda?ofertas=1" className="text-tenue hover:text-texto">Ofertas</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-widest text-apagado">Compra segura</h2>
              <ul className="mt-4 space-y-2 text-sm text-tenue">
                <li>Envío a todo Guatemala · gratis desde Q500</li>
                <li>Productos nuevos y sellados</li>
                <li>Garantía de 30 días contra defectos</li>
                <li>Consulta tu pedido con su enlace privado</li>
                <li className="pt-2">
                  <Link href="/terminos-y-condiciones" className="hover:text-texto">Términos y condiciones</Link>
                </li>
                <li>
                  <Link href="/politica-de-privacidad" className="hover:text-texto">Política de privacidad</Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-widest text-apagado">Formas de pago</h2>
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Formas de pago aceptadas">
                {['Visa', 'Mastercard', 'Contra entrega', 'Transferencia'].map((m) => (
                  <li key={m} className="rounded-lg border border-borde bg-fondo px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wider text-tenue">
                    {m}
                  </li>
                ))}
              </ul>
              <Suspense fallback={<p className="mt-4 text-xs text-apagado">Precios en quetzales (Q).</p>}>
                <AvisoTipoCambio />
              </Suspense>
            </div>
          </div>
          <div className="border-t border-borde">
            <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-apagado">
              © {TIENDA.nombre} · Proyecto de Seminario · WordPress headless + WooCommerce + Next.js. Las marcas
              mencionadas pertenecen a sus respectivos dueños.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

function EnlaceCarrito() {
  return (
    <Link href="/carrito" className="boton-secundario px-4 py-2">
      Carrito
    </Link>
  );
}
