import { Suspense } from 'react';
import Link from 'next/link';
import Form from 'next/form';
import { getProductos, getCategorias, type Producto, type Categoria } from '@/lib/woo';
import { limpiarHtml } from '@/lib/producto';
import { TarjetaProducto } from '@/components/TarjetaProducto';
import { AvisoConexion } from '@/components/AvisoConexion';
import { CuadriculaCargando } from '@/components/Cargando';

export const metadata = { title: 'Tienda' };

type Filtros = Promise<{ categoria?: string; buscar?: string; pagina?: string; orden?: string; ofertas?: string }>;

const ORDENES = [
  { id: 'date', nombre: 'Novedades' },
  { id: 'price', nombre: 'Menor precio' },
  { id: 'popularity', nombre: 'Más vendidos' }
] as const;
type Orden = (typeof ORDENES)[number]['id'];

const POR_PAGINA = 12;

// Filtros que llegan en la URL: /tienda?categoria=playstation-5&buscar=mario&orden=price&ofertas=1&pagina=2
export default function Tienda({ searchParams }: { searchParams: Filtros }) {
  return (
    <Suspense fallback={<CuadriculaCargando cantidad={8} />}>
      <Catalogo searchParams={searchParams} />
    </Suspense>
  );
}

async function Catalogo({ searchParams }: { searchParams: Filtros }) {
  const params = await searchParams;
  const categoria = params.categoria ?? ''; // slug de la categoría
  const buscar = params.buscar?.trim().slice(0, 80) ?? '';
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const ofertas = params.ofertas === '1';
  // Solo se aceptan órdenes conocidos (lo demás viene de la URL y no es confiable).
  const orden: Orden = ORDENES.find((o) => o.id === params.orden)?.id ?? 'date';

  let productos: Producto[] = [];
  let categorias: Categoria[] = [];
  let totalPaginas = 1;
  let total = 0;
  let error: unknown = null;
  try {
    const [resultado, cats] = await Promise.all([
      getProductos({ pagina, porPagina: POR_PAGINA, categoria, buscar, orden, ofertas }),
      getCategorias()
    ]);
    ({ productos, totalPaginas, total } = resultado);
    categorias = cats;
  } catch (e) {
    error = e;
  }

  const categoriaActual = categorias.find((c) => c.slug === categoria);
  // Menú en dos niveles: Videojuegos → consolas, Accesorios → tipos, etc.
  const padres = categorias.filter((c) => !c.parent);
  const hijosDe = (id: number) => categorias.filter((c) => c.parent === id);

  function url(cambios: { pagina?: number; orden?: Orden; ofertas?: boolean; categoria?: string | null }) {
    const p = new URLSearchParams();
    const cat = cambios.categoria === undefined ? categoria : cambios.categoria;
    if (cat) p.set('categoria', cat);
    if (buscar) p.set('buscar', buscar);
    const o = cambios.orden ?? orden;
    if (o !== 'date') p.set('orden', o);
    if (cambios.ofertas ?? ofertas) p.set('ofertas', '1');
    if (cambios.pagina && cambios.pagina > 1) p.set('pagina', String(cambios.pagina));
    const texto = p.toString();
    return texto ? `/tienda?${texto}` : '/tienda';
  }

  // Texto plano (nunca HTML): `buscar` viene de la URL y podría traer código malicioso (XSS).
  const titulo = buscar
    ? `“${buscar}”`
    : categoriaActual
      ? limpiarHtml(categoriaActual.name)
      : ofertas
        ? 'Ofertas'
        : 'Todo el catálogo';

  const enlaceCategoria = (activa: boolean) =>
    `flex items-center justify-between rounded-lg px-3 py-1.5 transition ${
      activa ? 'bg-marca-claro font-semibold text-texto' : 'text-tenue hover:bg-white/5 hover:text-texto'
    }`;

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <aside className="space-y-6">
        <Form action="/tienda" className="md:hidden" role="search">
          <input type="search" name="buscar" defaultValue={buscar} aria-label="Buscar productos" placeholder="Buscar…" className="campo mt-0" />
        </Form>

        <nav aria-label="Categorías" className="panel space-y-4 p-4 text-sm">
          <Link href={url({ categoria: null, pagina: 1 })} className={enlaceCategoria(!categoria)}>
            Todo el catálogo
          </Link>
          {padres.map((padre) => (
            <div key={padre.id}>
              <Link href={url({ categoria: padre.slug, pagina: 1 })} className={enlaceCategoria(categoria === padre.slug)}>
                <span className="font-display font-bold uppercase tracking-wider">{limpiarHtml(padre.name)}</span>
                <span className="text-xs text-apagado">{padre.count}</span>
              </Link>
              {hijosDe(padre.id).length > 0 && (
                <ul className="ml-3 mt-1 space-y-0.5 border-l border-borde pl-2">
                  {hijosDe(padre.id).map((c) => (
                    <li key={c.id}>
                      <Link href={url({ categoria: c.slug, pagina: 1 })} className={enlaceCategoria(categoria === c.slug)}>
                        <span>{limpiarHtml(c.name)}</span>
                        <span className="text-xs text-apagado">{c.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>

        <Link
          href={url({ ofertas: !ofertas, pagina: 1 })}
          aria-pressed={ofertas}
          className={`flex items-center justify-between rounded-2xl border p-4 font-display text-sm font-bold uppercase tracking-wider transition ${
            ofertas ? 'border-neon bg-neon/10 text-neon' : 'border-borde bg-superficie text-tenue hover:text-texto'
          }`}
        >
          Solo ofertas
          <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${ofertas ? 'justify-end bg-neon' : 'bg-superficie-2'}`} aria-hidden="true">
            <span className="size-4 rounded-full bg-fondo" />
          </span>
        </Link>
      </aside>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-borde pb-5">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-neon">
              {buscar ? 'Resultados de búsqueda' : 'Tienda'}
            </p>
            <h1 className="mt-1 text-4xl font-bold uppercase">{titulo}</h1>
            {!error && <p className="mt-1 text-sm text-tenue">{total} {total === 1 ? 'producto' : 'productos'}</p>}
          </div>

          <nav aria-label="Ordenar" className="flex flex-wrap gap-1 rounded-xl border border-borde bg-superficie p-1 text-sm">
            {ORDENES.map((o) => (
              <Link
                key={o.id}
                href={url({ orden: o.id, pagina: 1 })}
                aria-current={orden === o.id ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 font-display font-semibold uppercase tracking-wider transition ${
                  orden === o.id ? 'bg-marca text-white' : 'text-tenue hover:text-texto'
                }`}
              >
                {o.nombre}
              </Link>
            ))}
          </nav>
        </div>

        {error ? (
          <div className="mt-6"><AvisoConexion error={error} /></div>
        ) : productos.length === 0 ? (
          <div className="panel mt-6 p-10 text-center">
            <p className="font-display text-xl font-bold uppercase">Sin resultados</p>
            <p className="mt-2 text-tenue">Prueba con otra búsqueda o quita los filtros.</p>
            <Link href="/tienda" className="boton-secundario mt-6">Ver todo el catálogo</Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {productos.map((p, i) => <TarjetaProducto key={p.id} producto={p} prioridad={i < 4} />)}
          </div>
        )}

        {totalPaginas > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Paginación">
            {pagina > 1 && <Link href={url({ pagina: pagina - 1 })} className="boton-secundario px-4 py-2">← Anterior</Link>}
            <span className="px-3 font-display text-sm uppercase tracking-wider text-tenue">
              Página {pagina} de {totalPaginas}
            </span>
            {pagina < totalPaginas && <Link href={url({ pagina: pagina + 1 })} className="boton-secundario px-4 py-2">Siguiente →</Link>}
          </nav>
        )}
      </section>
    </div>
  );
}
