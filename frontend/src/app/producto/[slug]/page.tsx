import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProducto, getProductos, getVariaciones, reponerReserva, type Producto } from '@/lib/woo';
import { limpiarHtml, categoriaPrincipal, plataformaDe, opcionesDeVariacion, textoStock, tipoDeProducto } from '@/lib/producto';
import { formatearPrecio, aDolares } from '@/lib/dinero';
import { getTipoCambio } from '@/lib/tipoCambio';
import { env } from '@/lib/env';
import { TIENDA } from '@/lib/config';
import { AvisoConexion } from '@/components/AvisoConexion';
import { FormularioCompra, type OpcionCompra } from '@/components/FormularioCompra';
import { BloqueCargando, CuadriculaCargando } from '@/components/Cargando';
import { GaleriaProducto } from '@/components/GaleriaProducto';
import { Portada } from '@/components/Portada';
import { Precio } from '@/components/Precio';
import { JsonLd } from '@/components/JsonLd';
import { TarjetaProducto } from '@/components/TarjetaProducto';

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
    <Suspense fallback={<BloqueCargando alto="h-[36rem]" />}>
      <DetalleProducto params={params} />
    </Suspense>
  );
}

const GARANTIAS = [
  'Producto nuevo y sellado de fábrica',
  'Envío a todo Guatemala · gratis desde Q500',
  'Pago con tarjeta, contra entrega o transferencia',
  'Garantía de 30 días contra defectos'
];

async function DetalleProducto({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Quien ve un producto suele añadirlo: se prepara una sesión de carrito en segundo plano
  // (después de responder) para que el primer "Añadir" no espere a WordPress.
  reponerReserva();

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
  const seccion = producto.categories.find((c) => !c.parent || ['videojuegos', 'consolas', 'accesorios', 'tarjetas-de-regalo'].includes(c.slug));
  const categoria = categoriaPrincipal(producto);
  const plataforma = plataformaDe(producto);
  const nombre = limpiarHtml(producto.name);

  // Opciones de compra de un producto variable (edición, color, modelo o monto), con su precio y stock.
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
      stockTexto: textoStock(v.stock_availability?.text, v.low_stock_remaining)
    }];
  });
  const porDefecto =
    variable?.opciones.find((o) => producto.attributes.some((a) => a.terms.some((t) => t.default && t.slug === o.valor)))
      ?.variacionId ?? variable?.opciones[0]?.variacionId ?? 0;

  return (
    <>
      <JsonLd datos={datosEstructurados(producto, variaciones)} />

      <nav className="flex flex-wrap gap-2 font-display text-xs font-semibold uppercase tracking-wider text-apagado" aria-label="Ruta">
        <Link href="/tienda" className="hover:text-texto">Tienda</Link>
        {seccion && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/tienda?categoria=${seccion.slug}`} className="hover:text-texto">{limpiarHtml(seccion.name)}</Link>
          </>
        )}
        {categoria && categoria !== seccion && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/tienda?categoria=${categoria.slug}`} className="hover:text-texto">{limpiarHtml(categoria.name)}</Link>
          </>
        )}
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <GaleriaProducto
          imagenes={producto.images.map(({ id, src, alt }) => ({ id, src, alt }))}
          nombre={nombre}
          formato={tipoDeProducto(producto) === 'juego' ? 'vertical' : 'horizontal'}
        >
          <Portada producto={producto} grande prioridad />
        </GaleriaProducto>

        <div className="lg:sticky lg:top-32 lg:self-start">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-marca-claro text-neon">{plataforma.nombre}</span>
            {categoria && <span className="chip border border-borde text-tenue">{limpiarHtml(categoria.name)}</span>}
            {producto.on_sale && producto.is_in_stock && <span className="chip bg-neon text-fondo">Oferta</span>}
          </div>
          <h1 className="mt-4 text-4xl font-bold uppercase leading-tight">{nombre}</h1>

          {producto.short_description && (
            <div className="contenido-wp mt-4" dangerouslySetInnerHTML={{ __html: producto.short_description }} />
          )}

          <div className="panel mt-6 p-6">
            {/* En productos variables, el precio lo muestra el selector según la opción elegida. */}
            {!variable && (
              <Precio
                monto={producto.prices.price}
                moneda={producto.prices}
                antes={producto.on_sale ? producto.prices.regular_price : undefined}
                tamano="grande"
              />
            )}

            {!producto.is_in_stock ? (
              <p className="mt-2 rounded-xl border border-borde bg-fondo px-4 py-3 font-display font-semibold uppercase tracking-wider text-tenue">
                Agotado por ahora
              </p>
            ) : variable && opciones.length > 0 ? (
              <FormularioCompra tipo="variable" atributo={variable.atributo} opciones={opciones} porDefecto={porDefecto} />
            ) : producto.type === 'simple' ? (
              <>
                <FormularioCompra tipo="simple" id={producto.id} maximo={producto.add_to_cart.maximum} />
                {producto.stock_availability?.text && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-tenue">
                    <span className="size-2 rounded-full bg-neon" aria-hidden="true" />
                    {textoStock(producto.stock_availability.text, producto.low_stock_remaining)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-tenue">Este tipo de producto no se puede comprar directamente en la tienda.</p>
            )}
          </div>

          <ul className="mt-6 grid gap-2.5 text-sm text-tenue sm:grid-cols-2">
            {GARANTIAS.map((g) => (
              <li key={g} className="flex gap-2">
                <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-neon" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {producto.description && (
        <section className="mt-16 grid gap-8 lg:grid-cols-[2fr_1fr]" aria-labelledby="t-descripcion">
          <div>
            <h2 id="t-descripcion" className="titulo-seccion">Descripción</h2>
            <div className="contenido-wp mt-6" dangerouslySetInnerHTML={{ __html: producto.description }} />
          </div>
          <dl className="panel h-fit divide-y divide-borde p-2 text-sm">
            {[
              ['Plataforma', plataforma.nombre],
              ['Categoría', categoria ? limpiarHtml(categoria.name) : '—'],
              ['Condición', 'Nuevo'],
              ['Envío', 'Todo Guatemala'],
              ['Código', `#${producto.id}`]
            ].map(([dt, dd]) => (
              <div key={dt} className="flex justify-between gap-4 px-3 py-2.5">
                <dt className="text-apagado">{dt}</dt>
                <dd className="text-right font-medium">{dd}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {categoria && (
        <Suspense fallback={<div className="mt-16"><CuadriculaCargando cantidad={4} /></div>}>
          <Relacionados categoria={categoria.slug} excluir={producto.id} />
        </Suspense>
      )}
    </>
  );
}

/** "También te puede interesar": otros productos de la misma categoría (desde la caché). */
async function Relacionados({ categoria, excluir }: { categoria: string; excluir: number }) {
  const productos = await getProductos({ categoria, porPagina: 5, orden: 'popularity' })
    .then((r) => r.productos.filter((p) => p.id !== excluir).slice(0, 4))
    .catch(() => []);
  if (productos.length === 0) return null;

  return (
    <section className="mt-16" aria-labelledby="t-relacionados">
      <h2 id="t-relacionados" className="titulo-seccion">También te puede interesar</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {productos.map((p) => <TarjetaProducto key={p.id} producto={p} />)}
      </div>
    </section>
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
