import { Suspense } from 'react';
import Link from 'next/link';
import Form from 'next/form';
import { getProductos, getCategorias, type Producto, type Categoria } from '@/lib/woo';
import { TarjetaProducto } from '@/components/TarjetaProducto';
import { AvisoConexion } from '@/components/AvisoConexion';
import { CuadriculaCargando } from '@/components/Cargando';

export const metadata = { title: 'Tienda' };

type Filtros = Promise<{ categoria?: string; buscar?: string; pagina?: string }>;

// Filtros que llegan en la URL: /tienda?categoria=playstation-5&buscar=mario&pagina=2
export default function Tienda({ searchParams }: { searchParams: Filtros }) {
  return (
    <Suspense fallback={<CuadriculaCargando cantidad={6} />}>
      <Catalogo searchParams={searchParams} />
    </Suspense>
  );
}

async function Catalogo({ searchParams }: { searchParams: Filtros }) {
  const params = await searchParams;
  const categoria = params.categoria ?? ''; // slug de la categoría
  const buscar = params.buscar?.trim() ?? '';
  const pagina = Math.max(1, Number(params.pagina) || 1);

  let productos: Producto[] = [];
  let categorias: Categoria[] = [];
  let totalPaginas = 1;
  let error: unknown = null;
  try {
    const [resultado, cats] = await Promise.all([getProductos({ pagina, categoria, buscar }), getCategorias()]);
    ({ productos, totalPaginas } = resultado);
    categorias = cats;
  } catch (e) {
    error = e;
  }

  const categoriaActual = categorias.find((c) => c.slug === categoria);
  // Menú en dos niveles: Videojuegos → consolas, Accesorios → tipos.
  const padres = categorias.filter((c) => !c.parent);
  const hijosDe = (id: number) => categorias.filter((c) => c.parent === id);

  function urlPagina(n: number) {
    const p = new URLSearchParams();
    if (categoria) p.set('categoria', categoria);
    if (buscar) p.set('buscar', buscar);
    p.set('pagina', String(n));
    return `/tienda?${p}`;
  }

  const claseCategoria = (activa: boolean) =>
    `flex justify-between rounded-md px-2 py-1 hover:bg-neutral-100 ${activa ? 'bg-marca-claro font-semibold text-marca-oscuro' : ''}`;

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <aside className="md:w-60 md:shrink-0">
        <Form action="/tienda" className="md:hidden">
          <input
            type="search"
            name="buscar"
            defaultValue={buscar}
            placeholder="Buscar juegos y accesorios…"
            className="w-full rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm"
          />
        </Form>
        <nav aria-label="Categorías" className="mt-4 space-y-4 text-sm md:mt-0">
          <Link href="/tienda" className={claseCategoria(!categoria)}>Todo el catálogo</Link>
          {padres.map((padre) => (
            <div key={padre.id}>
              <Link href={`/tienda?categoria=${padre.slug}`} className={claseCategoria(categoria === padre.slug)}>
                <span className="font-semibold uppercase tracking-wide" dangerouslySetInnerHTML={{ __html: padre.name }} />
                <span className="text-neutral-400">{padre.count}</span>
              </Link>
              <ul className="mt-1 space-y-0.5 border-l border-neutral-200 pl-2">
                {hijosDe(padre.id).map((c) => (
                  <li key={c.id}>
                    <Link href={`/tienda?categoria=${c.slug}`} className={claseCategoria(categoria === c.slug)}>
                      <span dangerouslySetInnerHTML={{ __html: c.name }} />
                      <span className="text-neutral-400">{c.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <section className="flex-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {buscar ? (
            `Resultados para "${buscar}"`
          ) : categoriaActual ? (
            <span dangerouslySetInnerHTML={{ __html: categoriaActual.name }} />
          ) : (
            'Todo el catálogo'
          )}
        </h1>

        {error ? (
          <div className="mt-6"><AvisoConexion error={error} /></div>
        ) : productos.length === 0 ? (
          <p className="mt-6 text-neutral-500">No encontramos productos.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
            {productos.map((p) => <TarjetaProducto key={p.id} producto={p} />)}
          </div>
        )}

        {totalPaginas > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2 text-sm" aria-label="Paginación">
            {pagina > 1 && (
              <Link href={urlPagina(pagina - 1)} className="rounded-full border px-4 py-1.5 hover:bg-white">← Anterior</Link>
            )}
            <span className="px-2 text-neutral-500">Página {pagina} de {totalPaginas}</span>
            {pagina < totalPaginas && (
              <Link href={urlPagina(pagina + 1)} className="rounded-full border px-4 py-1.5 hover:bg-white">Siguiente →</Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
