import Link from 'next/link';
import type { Producto } from '@/lib/tipos';
import { categoriaPrincipal } from '@/lib/producto';
import { Portada } from './Portada';
import { Precio } from './Precio';

export function TarjetaProducto({ producto, prioridad = false }: { producto: Producto; prioridad?: boolean }) {
  const { prices } = producto;
  const categoria = categoriaPrincipal(producto);
  const variable = producto.type === 'variable';
  const atributo = producto.attributes.find((a) => a.has_variations)?.name;

  return (
    <Link
      href={`/producto/${producto.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:-translate-y-0.5 hover:border-marca hover:shadow-lg hover:shadow-marca/10"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
        <Portada producto={producto} prioridad={prioridad} className="transition duration-300 group-hover:scale-105" />
        {!producto.is_in_stock ? (
          <span className="absolute right-3 top-3 rounded-full bg-neutral-950 px-2 py-0.5 text-xs font-bold text-white">
            Agotado
          </span>
        ) : (
          producto.on_sale && (
            <span className="absolute right-3 top-3 rounded-full bg-neon px-2 py-0.5 text-xs font-bold text-neutral-950">
              Oferta
            </span>
          )
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {categoria && (
          <span className="text-xs text-neutral-500" dangerouslySetInnerHTML={{ __html: categoria.name }} />
        )}
        <h3 className="font-medium leading-snug" dangerouslySetInnerHTML={{ __html: producto.name }} />
        {variable && (
          <span className="text-xs font-medium text-marca">
            {producto.variations.length} {atributo === 'Color' ? 'colores' : 'ediciones'} disponibles
          </span>
        )}
        <Precio
          monto={variable ? (prices.price_range?.min_amount ?? prices.price) : prices.price}
          moneda={prices}
          desde={variable && prices.price_range?.min_amount !== prices.price_range?.max_amount}
          antes={!variable && producto.on_sale ? prices.regular_price : undefined}
          className="mt-auto pt-2"
        />
      </div>
    </Link>
  );
}
