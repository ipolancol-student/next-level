import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { TIENDA } from '@/lib/config';
import { getProducto, getProductos, type Producto } from '@/lib/woo';
import { limpiarHtml } from '@/lib/producto';
import { getPagina } from '@/lib/wordpress';
import { TarjetaProducto } from '@/components/TarjetaProducto';
import { AvisoConexion } from '@/components/AvisoConexion';
import { BloqueCargando, CuadriculaCargando } from '@/components/Cargando';
import { Portada } from '@/components/Portada';
import { Precio } from '@/components/Precio';

// Título y descripción SEO de la página "Inicio" de WordPress (Yoast), si existen.
export async function generateMetadata(): Promise<Metadata> {
  const portada = await getPagina(TIENDA.slugPortada);
  const metadata: Metadata = {};
  if (portada?.seo.title) metadata.title = { absolute: limpiarHtml(portada.seo.title) };
  if (portada?.seo.description) metadata.description = portada.seo.description;
  return metadata;
}

// Accesos por plataforma (slugs de las subcategorías de Videojuegos en WordPress).
const PLATAFORMAS = [
  { slug: 'playstation-5', nombre: 'PlayStation 5', color: 'from-ps/80', letra: 'PS5' },
  { slug: 'xbox-series', nombre: 'Xbox Series X|S', color: 'from-xbox/80', letra: 'XBOX' },
  { slug: 'nintendo-switch', nombre: 'Nintendo Switch', color: 'from-nintendo/80', letra: 'SWITCH' },
  { slug: 'nintendo-switch-2', nombre: 'Nintendo Switch 2', color: 'from-nintendo/60', letra: 'SWITCH 2' }
];

const BENEFICIOS = [
  { titulo: 'Envío gratis', texto: 'En compras desde Q500 a todo Guatemala', icono: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z' },
  { titulo: 'Pago seguro', texto: 'Tarjeta, contra entrega o transferencia', icono: 'M3 6h18v12H3zM3 10h18M7 15h4' },
  { titulo: 'Nuevos y sellados', texto: 'Garantía de 30 días contra defectos', icono: 'M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4ZM9 12l2 2 4-4' },
  { titulo: 'Quetzales y dólares', texto: 'Tipo de cambio oficial del Banguat', icono: 'M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6' }
];

export default function Inicio() {
  // Todo lo que viene de WordPress va dentro de <Suspense>: Next.js manda primero
  // el "esqueleto" de la página y luego los datos en cuanto llegan (streaming).
  return (
    <div className="space-y-16">
      <Suspense fallback={<BloqueCargando alto="h-[28rem]" />}>
        <Heroe />
      </Suspense>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFICIOS.map((b) => (
          <li key={b.titulo} className="panel flex items-center gap-4 p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-marca-claro text-neon">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={b.icono} />
              </svg>
            </span>
            <span>
              <span className="block font-display font-bold uppercase tracking-wide">{b.titulo}</span>
              <span className="block text-sm text-tenue">{b.texto}</span>
            </span>
          </li>
        ))}
      </ul>

      <section aria-labelledby="t-plataformas">
        <h2 id="t-plataformas" className="titulo-seccion">Compra por plataforma</h2>
        <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PLATAFORMAS.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/tienda?categoria=${p.slug}`}
                className={`group relative flex h-36 flex-col justify-end overflow-hidden rounded-2xl border border-borde bg-linear-to-br ${p.color} to-superficie p-5 transition hover:-translate-y-1 hover:border-borde-fuerte`}
              >
                <span className="rejilla absolute inset-0 opacity-50" aria-hidden="true" />
                <span className="absolute -right-2 -top-3 font-display text-6xl font-bold text-white/10 transition group-hover:text-white/20" aria-hidden="true">
                  {p.letra}
                </span>
                <span className="relative font-display text-lg font-bold uppercase tracking-wide">{p.nombre}</span>
                <span className="relative text-sm text-tenue transition group-hover:text-texto">Ver juegos →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Suspense fallback={<CuadriculaCargando />}>
        <Escaparate />
      </Suspense>
    </div>
  );
}

/** Portada principal: texto editable en WordPress + consola destacada. */
async function Heroe() {
  await connection(); // se arma en cada visita: el build no depende de WordPress
  const [portada, destacada] = await Promise.all([
    getPagina(TIENDA.slugPortada),
    // Producto destacado de la portada (se cambia aquí o se podría leer de un campo de WordPress).
    getProducto('consola-nintendo-switch-2').catch(() => null)
  ]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-borde bg-superficie">
      <div className="rejilla absolute inset-0" aria-hidden="true" />
      <div className="absolute -left-32 -top-32 size-96 rounded-full bg-marca/40 blur-[120px]" aria-hidden="true" />
      <div className="absolute -bottom-40 right-1/3 size-96 rounded-full bg-neon/20 blur-[120px]" aria-hidden="true" />

      <div className="relative grid items-center gap-10 p-8 md:grid-cols-[1.2fr_1fr] md:p-14">
        <div className="animate-aparecer">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-neon">{TIENDA.lema}</p>
          {portada ? (
            <>
              <h1 className="mt-4 text-5xl font-bold uppercase leading-[0.95] sm:text-6xl" dangerouslySetInnerHTML={{ __html: portada.titulo }} />
              <div className="contenido-wp mt-5 max-w-lg text-lg" dangerouslySetInnerHTML={{ __html: portada.contenido }} />
            </>
          ) : (
            <h1 className="mt-4 text-5xl font-bold uppercase leading-[0.95] sm:text-6xl">Sube al siguiente nivel</h1>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/tienda?categoria=videojuegos" className="boton-primario">Ver videojuegos</Link>
            <Link href="/tienda?ofertas=1" className="boton-secundario">Ofertas de la semana</Link>
          </div>
        </div>

        {destacada && (
          <Link
            href={`/producto/${destacada.slug}`}
            className="group relative mx-auto w-full max-w-sm animate-aparecer [animation-delay:150ms]"
          >
            <div className="absolute -inset-1 rounded-3xl bg-linear-to-br from-marca to-neon opacity-60 blur-lg transition group-hover:opacity-90" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-3xl border border-borde-fuerte bg-fondo">
              <div className="relative aspect-[4/3]">
                <Portada producto={destacada} grande prioridad />
              </div>
              <div className="flex items-end justify-between gap-4 p-5">
                <div>
                  <span className="chip bg-neon text-fondo">Destacado</span>
                  <p className="mt-2 font-display text-lg font-bold uppercase leading-tight">{limpiarHtml(destacada.name)}</p>
                </div>
                <Precio
                  monto={destacada.prices.price_range?.min_amount ?? destacada.prices.price}
                  moneda={destacada.prices}
                  desde={destacada.type === 'variable'}
                  className="shrink-0 text-right"
                />
              </div>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}

/** Secciones de productos de la portada (todas en paralelo, desde la caché). */
async function Escaparate() {
  await connection();
  let datos: Producto[][];
  try {
    datos = await Promise.all([
      getProductos({ ofertas: true, porPagina: 8, orden: 'popularity' }),
      getProductos({ categoria: 'consolas', porPagina: 4, orden: 'price' }),
      getProductos({ categoria: 'videojuegos', porPagina: 8 }),
      getProductos({ categoria: 'accesorios', porPagina: 4, orden: 'popularity' }),
      getProductos({ categoria: 'tarjetas-de-regalo', porPagina: 3 })
    ]).then((r) => r.map((x) => x.productos));
  } catch (error) {
    return <AvisoConexion error={error} />;
  }
  const [ofertas, consolas, juegos, accesorios, tarjetas] = datos;

  return (
    <div className="space-y-16">
      <Seccion id="ofertas" titulo="Ofertas" subtitulo="Precios rebajados por tiempo limitado" enlace="/tienda?ofertas=1" productos={ofertas} prioridad />
      <Seccion id="consolas" titulo="Consolas" subtitulo="La nueva generación, lista para jugar" enlace="/tienda?categoria=consolas" productos={consolas} />
      <Seccion id="juegos" titulo="Lo nuevo en videojuegos" subtitulo="Juegos físicos nuevos y sellados" enlace="/tienda?categoria=videojuegos" productos={juegos} />
      <Seccion id="accesorios" titulo="Accesorios" subtitulo="Controles, audífonos, carga y más" enlace="/tienda?categoria=accesorios" productos={accesorios} />

      {tarjetas.length > 0 && (
        <section aria-labelledby="t-tarjetas" className="relative overflow-hidden rounded-3xl border border-borde bg-linear-to-br from-marca/25 via-superficie to-superficie p-8 md:p-12">
          <div className="rejilla absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_2fr]">
            <div>
              <h2 id="t-tarjetas" className="titulo-seccion">Tarjetas de regalo</h2>
              <p className="mt-3 text-tenue">
                Saldo para PlayStation Store, Xbox y Nintendo eShop. El regalo perfecto: que elijan su próximo juego.
              </p>
              <Link href="/tienda?categoria=tarjetas-de-regalo" className="boton-neon mt-6">Ver tarjetas</Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {tarjetas.map((p) => <TarjetaProducto key={p.id} producto={p} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Seccion({
  id,
  titulo,
  subtitulo,
  enlace,
  productos,
  prioridad = false
}: {
  id: string;
  titulo: string;
  subtitulo: string;
  enlace: string;
  productos: Producto[];
  prioridad?: boolean;
}) {
  if (productos.length === 0) return null;
  return (
    <section aria-labelledby={`t-${id}`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={`t-${id}`} className="titulo-seccion">{titulo}</h2>
          <p className="mt-1 pl-4.5 text-sm text-tenue">{subtitulo}</p>
        </div>
        <Link href={enlace} className="font-display text-sm font-semibold uppercase tracking-wider text-neon hover:brightness-125">
          Ver todo →
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {productos.map((p, i) => <TarjetaProducto key={p.id} producto={p} prioridad={prioridad && i < 4} />)}
      </div>
    </section>
  );
}
