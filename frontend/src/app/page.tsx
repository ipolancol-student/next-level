import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { TIENDA } from '@/lib/config';
import { getProductos, limpiarHtml, type Producto } from '@/lib/woo';
import { getPagina } from '@/lib/wordpress';
import { TarjetaProducto } from '@/components/TarjetaProducto';
import { AvisoConexion } from '@/components/AvisoConexion';
import { BloqueCargando, CuadriculaCargando } from '@/components/Cargando';

// Título y descripción SEO de la página "Inicio" de WordPress (Yoast), si existen.
export async function generateMetadata(): Promise<Metadata> {
  const portada = await getPagina(TIENDA.slugPortada);
  const metadata: Metadata = {};
  if (portada?.seo.title) metadata.title = { absolute: limpiarHtml(portada.seo.title) };
  if (portada?.seo.description) metadata.description = portada.seo.description;
  return metadata;
}

// Accesos rápidos por consola (slugs de las categorías creadas en WordPress).
const CONSOLAS = [
  { slug: 'playstation-5', nombre: 'PlayStation 5', estilo: 'from-blue-600 to-slate-950' },
  { slug: 'xbox-series', nombre: 'Xbox Series X|S', estilo: 'from-green-600 to-neutral-950' },
  { slug: 'nintendo-switch', nombre: 'Nintendo Switch', estilo: 'from-red-600 to-neutral-950' },
  { slug: 'nintendo-switch-2', nombre: 'Nintendo Switch 2', estilo: 'from-rose-700 to-neutral-950' }
];

export default function Inicio() {
  // Todo lo que viene de WordPress va dentro de <Suspense>: Next.js manda primero
  // el "esqueleto" de la página y luego los datos en cuanto llegan (streaming).
  return (
    <>
      <Suspense fallback={<BloqueCargando alto="h-72" />}>
        <Portada />
      </Suspense>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Compra por consola</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {CONSOLAS.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/tienda?categoria=${c.slug}`}
                className={`flex h-24 items-end rounded-xl bg-linear-to-br p-4 font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg ${c.estilo}`}
              >
                {c.nombre}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Suspense fallback={<div className="mt-10"><CuadriculaCargando /></div>}>
        <Destacados />
      </Suspense>
    </>
  );
}

async function Portada() {
  // Portada editable desde WordPress (Páginas → "Inicio"), como en el video.
  const portada = await getPagina(TIENDA.slugPortada);
  return (
    <section className="relative overflow-hidden rounded-2xl bg-neutral-950 px-6 py-14 text-white sm:px-12">
      <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-marca/50 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 right-40 size-72 rounded-full bg-neon/25 blur-3xl" aria-hidden="true" />
      <p className="relative text-sm font-semibold uppercase tracking-widest text-neon">{TIENDA.lema}</p>
      {portada ? (
        <>
          <h1 className="relative mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl" dangerouslySetInnerHTML={{ __html: portada.titulo }} />
          <div className="contenido-wp relative mt-4 max-w-xl text-neutral-300!" dangerouslySetInnerHTML={{ __html: portada.contenido }} />
        </>
      ) : (
        <>
          <h1 className="relative mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Bienvenido a {TIENDA.nombre}</h1>
          <p className="relative mt-4 max-w-xl text-neutral-300">
            Crea una página llamada <strong>&quot;Inicio&quot;</strong> en WordPress para editar este texto desde el panel.
          </p>
        </>
      )}
      <div className="relative mt-8 flex flex-wrap gap-3">
        <Link href="/tienda?categoria=videojuegos" className="rounded-full bg-marca px-6 py-2.5 font-semibold hover:bg-marca-oscuro">
          Ver videojuegos
        </Link>
        <Link href="/tienda?categoria=accesorios" className="rounded-full border border-white/30 px-6 py-2.5 font-semibold hover:bg-white/10">
          Ver accesorios
        </Link>
      </div>
    </section>
  );
}

async function Destacados() {
  let juegos: Producto[];
  let accesorios: Producto[];
  try {
    [{ productos: juegos }, { productos: accesorios }] = await Promise.all([
      getProductos({ porPagina: 8, categoria: 'videojuegos' }),
      getProductos({ porPagina: 4, categoria: 'accesorios' })
    ]);
  } catch (error) {
    return <div className="mt-10"><AvisoConexion error={error} /></div>;
  }

  if (juegos.length === 0 && accesorios.length === 0) {
    return <p className="mt-10 text-neutral-500">Todavía no hay productos. Agrégalos en WooCommerce → Productos.</p>;
  }

  return (
    <>
      <Seccion titulo="Videojuegos" enlace="/tienda?categoria=videojuegos" productos={juegos} />
      <Seccion titulo="Accesorios" enlace="/tienda?categoria=accesorios" productos={accesorios} />
    </>
  );
}

function Seccion({ titulo, enlace, productos }: { titulo: string; enlace: string; productos: Producto[] }) {
  if (productos.length === 0) return null;
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">{titulo}</h2>
        <Link href={enlace} className="text-sm font-medium text-marca hover:underline">Ver todos →</Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {productos.map((p) => <TarjetaProducto key={p.id} producto={p} />)}
      </div>
    </section>
  );
}
