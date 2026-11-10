/* eslint-disable @next/next/no-img-element -- las imágenes vienen de WordPress (ver README) */
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProducto, limpiarHtml, categoriaPrincipal, plataformaDe, type Producto } from '@/lib/woo';
import { AvisoConexion } from '@/components/AvisoConexion';
import { BotonAgregar } from '@/components/BotonAgregar';
import { BloqueCargando } from '@/components/Cargando';
import { Portada } from '@/components/Portada';
import { Precio } from '@/components/Precio';

// Ruta dinámica: /producto/astro-bot-ps5 → busca el producto por su slug.
export async function generateMetadata({ params }: PageProps<'/producto/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const producto = await getProducto(slug).catch(() => null);
  if (!producto) return { title: 'Producto' };
  return {
    title: limpiarHtml(producto.name),
    description: limpiarHtml(producto.short_description).slice(0, 160)
  };
}

export default function PaginaProducto({ params }: PageProps<'/producto/[slug]'>) {
  return (
    <Suspense fallback={<BloqueCargando alto="h-96" />}>
      <DetalleProducto params={params} />
    </Suspense>
  );
}

async function DetalleProducto({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let producto: Producto | null;
  try {
    producto = await getProducto(slug);
  } catch (error) {
    return <AvisoConexion error={error} />;
  }
  if (!producto) notFound();

  // Solo los productos "simples" se pueden añadir directo.
  const esSimple = producto.type === 'simple';
  const padre = producto.categories.find((c) => c.slug === 'videojuegos' || c.slug === 'accesorios');
  const categoria = categoriaPrincipal(producto);
  const plataforma = plataformaDe(producto);

  return (
    <>
      <nav className="text-sm text-neutral-500" aria-label="Ruta">
        <Link href="/tienda" className="hover:text-marca">Tienda</Link>
        {padre && (
          <>
            {' / '}
            <Link href={`/tienda?categoria=${padre.slug}`} className="hover:text-marca" dangerouslySetInnerHTML={{ __html: padre.name }} />
          </>
        )}
        {categoria && categoria !== padre && (
          <>
            {' / '}
            <Link href={`/tienda?categoria=${categoria.slug}`} className="hover:text-marca" dangerouslySetInnerHTML={{ __html: categoria.name }} />
          </>
        )}
      </nav>

      <div className="mt-4 grid gap-10 md:grid-cols-2">
        <div className="space-y-3">
          <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <Portada producto={producto} grande />
          </div>
          {producto.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {producto.images.slice(1, 5).map((img) => (
                <img key={img.id} src={img.thumbnail} alt={img.alt} loading="lazy" className="aspect-square rounded-lg border border-neutral-200 object-cover" />
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="inline-block rounded-full bg-neutral-950 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neon">
            {plataforma.nombre}
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight" dangerouslySetInnerHTML={{ __html: producto.name }} />
          <Precio
            monto={producto.prices.price}
            moneda={producto.prices}
            antes={producto.on_sale ? producto.prices.regular_price : undefined}
            tamano="grande"
            className="mt-4"
          />

          {producto.short_description && (
            <div className="contenido-wp mt-4" dangerouslySetInnerHTML={{ __html: producto.short_description }} />
          )}

          {!producto.is_in_stock ? (
            <p className="mt-6 rounded-lg bg-neutral-100 px-4 py-3 font-medium text-neutral-700">
              Agotado por ahora. ¡Vuelve pronto!
            </p>
          ) : !esSimple ? (
            <p className="mt-6 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
              {producto.type === 'variable'
                ? 'Este producto tiene variaciones (edición, color…). Esta versión de la tienda solo vende productos simples.'
                : 'Este tipo de producto no se puede comprar directamente en esta versión de la tienda.'}
            </p>
          ) : (
            <BotonAgregar id={producto.id} minimo={producto.add_to_cart.minimum} maximo={producto.add_to_cart.maximum} />
          )}
          {producto.is_in_stock && producto.stock_availability?.text && (
            <p className="mt-3 text-sm text-neutral-500">{producto.stock_availability.text}</p>
          )}
        </div>
      </div>

      {producto.description && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-xl font-bold">Descripción</h2>
          <div className="contenido-wp mt-4" dangerouslySetInnerHTML={{ __html: producto.description }} />
        </section>
      )}
    </>
  );
}
