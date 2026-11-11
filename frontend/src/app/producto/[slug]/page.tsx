import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProducto, getVariaciones, type Producto } from '@/lib/woo';
import { limpiarHtml, categoriaPrincipal, plataformaDe, opcionesDeVariacion } from '@/lib/producto';
import { formatearPrecio, aDolares } from '@/lib/dinero';
import { getTipoCambio } from '@/lib/tipoCambio';
import { env } from '@/lib/env';
import { TIENDA } from '@/lib/config';
import { AvisoConexion } from '@/components/AvisoConexion';
import { FormularioCompra, type OpcionCompra } from '@/components/FormularioCompra';
import { BloqueCargando } from '@/components/Cargando';
import { GaleriaProducto } from '@/components/GaleriaProducto';
import { Portada } from '@/components/Portada';
import { Precio } from '@/components/Precio';
import { JsonLd } from '@/components/JsonLd';

// Ruta dinámica: /producto/astro-bot-ps5 → busca el producto por su slug.
export async function generateMetadata({ params }: PageProps<'/producto/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const producto = await getProducto(slug).catch(() => null);
  if (!producto) return { title: 'Producto' };

  const titulo = limpiarHtml(producto.name);
  const descripcion = limpiarHtml(producto.short_description).slice(0, 160);
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: `/producto/${producto.slug}` },
    openGraph: {
      type: 'website',
      title: titulo,
      description: descripcion,
      siteName: TIENDA.nombre,
      locale: 'es_GT',
      images: producto.images[0] ? [{ url: producto.images[0].src, alt: producto.images[0].alt || titulo }] : undefined
    }
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
  let variaciones: Producto[] = [];
  try {
    producto = await getProducto(slug);
    if (producto?.type === 'variable') variaciones = await getVariaciones(producto);
  } catch (error) {
    return <AvisoConexion error={error} />;
  }
  if (!producto) notFound();

  const { quetzalesPorDolar } = await getTipoCambio();
  const padre = producto.categories.find((c) => c.slug === 'videojuegos' || c.slug === 'accesorios');
  const categoria = categoriaPrincipal(producto);
  const plataforma = plataformaDe(producto);
  const nombre = limpiarHtml(producto.name);

  // Opciones de compra de un producto variable (edición o color), con su precio y stock.
  const variable = producto.type === 'variable' ? opcionesDeVariacion(producto) : null;
  const opciones: OpcionCompra[] = (variable?.opciones ?? []).flatMap((o) => {
    const v = variaciones.find((x) => x.id === o.variacionId);
    if (!v) return [];
    return [{
      variacionId: o.variacionId,
      nombre: o.nombre,
      precio: formatearPrecio(v.prices.price, v.prices),
      precioAntes: v.on_sale ? formatearPrecio(v.prices.regular_price, v.prices) : undefined,
      precioUsd: aDolares(v.prices.price, v.prices.currency_minor_unit, quetzalesPorDolar),
      enStock: v.is_in_stock,
      stockTexto: v.stock_availability?.text
    }];
  });
  const porDefecto =
    variable?.opciones.find((o) => producto.attributes.some((a) => a.terms.some((t) => t.default && t.slug === o.valor)))
      ?.variacionId ?? variable?.opciones[0]?.variacionId ?? 0;

  return (
    <>
      <JsonLd datos={datosEstructurados(producto, variaciones)} />

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
        <GaleriaProducto imagenes={producto.images.map(({ id, src, alt }) => ({ id, src, alt }))} nombre={nombre}>
          <Portada producto={producto} grande />
        </GaleriaProducto>

        <div>
          <span className="inline-block rounded-full bg-neutral-950 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neon">
            {plataforma.nombre}
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight" dangerouslySetInnerHTML={{ __html: producto.name }} />

          {/* En productos variables, el precio lo muestra el selector según la opción elegida. */}
          {!variable && (
            <Precio
              monto={producto.prices.price}
              moneda={producto.prices}
              antes={producto.on_sale ? producto.prices.regular_price : undefined}
              tamano="grande"
              className="mt-4"
            />
          )}

          {producto.short_description && (
            <div className="contenido-wp mt-4" dangerouslySetInnerHTML={{ __html: producto.short_description }} />
          )}

          {!producto.is_in_stock ? (
            <p className="mt-6 rounded-lg bg-neutral-100 px-4 py-3 font-medium text-neutral-700">
              Agotado por ahora. ¡Vuelve pronto!
            </p>
          ) : variable && opciones.length > 0 ? (
            <FormularioCompra tipo="variable" atributo={variable.atributo} opciones={opciones} porDefecto={porDefecto} />
          ) : producto.type === 'simple' ? (
            <>
              <FormularioCompra tipo="simple" id={producto.id} maximo={producto.add_to_cart.maximum} />
              {producto.stock_availability?.text && (
                <p className="mt-3 text-sm text-neutral-500">{producto.stock_availability.text}</p>
              )}
            </>
          ) : (
            <p className="mt-6 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
              Este tipo de producto no se puede comprar directamente en la tienda.
            </p>
          )}

          <ul className="mt-8 grid gap-2 text-sm text-neutral-600">
            <li>✓ Producto nuevo y sellado</li>
            <li>✓ Envío a todo Guatemala · gratis desde Q500</li>
            <li>✓ Pago seguro con tarjeta, contra entrega o transferencia</li>
          </ul>
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

/** schema.org/Product: una oferta (simple) o un rango de precios (variable). */
function datosEstructurados(producto: Producto, variaciones: Producto[]) {
  const url = `${env().SITE_URL}/producto/${producto.slug}`;
  const aNumero = (monto: string) => (Number(monto) / 10 ** producto.prices.currency_minor_unit).toFixed(2);
  const disponibilidad = (enStock: boolean) => `https://schema.org/${enStock ? 'InStock' : 'OutOfStock'}`;

  const ofertas =
    variaciones.length > 0
      ? {
          '@type': 'AggregateOffer',
          priceCurrency: producto.prices.currency_code,
          lowPrice: aNumero(producto.prices.price_range?.min_amount ?? producto.prices.price),
          highPrice: aNumero(producto.prices.price_range?.max_amount ?? producto.prices.price),
          offerCount: variaciones.length,
          availability: disponibilidad(producto.is_in_stock)
        }
      : {
          '@type': 'Offer',
          url,
          priceCurrency: producto.prices.currency_code,
          price: aNumero(producto.prices.price),
          availability: disponibilidad(producto.is_in_stock),
          itemCondition: 'https://schema.org/NewCondition'
        };

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: limpiarHtml(producto.name),
    description: limpiarHtml(producto.short_description),
    image: producto.images.map((i) => i.src),
    category: categoriaPrincipal(producto)?.name,
    brand: { '@type': 'Brand', name: plataformaDe(producto).nombre },
    url,
    offers: ofertas
  };
}
