import Link from 'next/link';
import { categoriaPrincipal, type Producto } from '@/lib/woo';
import { Portada } from './Portada';
import { Precio } from './Precio';

export function TarjetaProducto({ producto }: { producto: Producto }) {
  const { prices } = producto;
  const categoria = categoriaPrincipal(producto);

  return (
    <Link
      href={`/producto/${producto.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:-translate-y-0.5 hover:border-marca hover:shadow-lg hover:shadow-marca/10"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
        <Portada producto={producto} className="transition duration-300 group-hover:scale-105" />
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
        <Precio
          monto={prices.price}
          moneda={prices}
          antes={producto.on_sale ? prices.regular_price : undefined}
          className="mt-auto pt-2"
        />
      </div>
    </Link>
  );
}
