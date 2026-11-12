import Link from 'next/link';
import type { Producto } from '@/lib/tipos';
import { categoriaPrincipal, limpiarHtml, tipoDeProducto } from '@/lib/producto';
import { Portada } from './Portada';
import { Precio } from './Precio';

// Claves en minúsculas: WooCommerce puede devolver "Color" o "color" según cómo se creó el atributo.
const NOMBRE_OPCIONES: Record<string, string> = {
  edición: 'ediciones',
  color: 'colores',
  modelo: 'modelos',
  monto: 'montos'
};

/** Descuento en porcentaje (redondeado) de un producto simple en oferta. */
function descuento(producto: Producto) {
  const antes = Number(producto.prices.regular_price);
  const ahora = Number(producto.prices.price);
  return antes > ahora ? Math.round((1 - ahora / antes) * 100) : 0;
}

export function TarjetaProducto({ producto, prioridad = false }: { producto: Producto; prioridad?: boolean }) {
  const { prices } = producto;
  const categoria = categoriaPrincipal(producto);
  const variable = producto.type === 'variable';
  const atributo = producto.attributes.find((a) => a.has_variations)?.name ?? '';
  const pct = !variable && producto.on_sale ? descuento(producto) : 0;
  const tarjeta = tipoDeProducto(producto) === 'tarjeta';

  return (
    <Link
      href={`/producto/${producto.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-borde bg-superficie transition duration-300 hover:-translate-y-1 hover:border-marca/60 hover:shadow-2xl hover:shadow-marca/20"
    >
      <div className={`relative overflow-hidden ${tarjeta ? 'aspect-[4/3]' : 'aspect-[3/4]'}`}>
        <Portada producto={producto} prioridad={prioridad} className="transition duration-500 group-hover:scale-105" />
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          {!producto.is_in_stock ? (
            <span className="chip bg-fondo/90 text-tenue">Agotado</span>
          ) : (
            <>
              {pct > 0 && <span className="chip bg-neon text-fondo">-{pct}%</span>}
              {variable && producto.on_sale && <span className="chip bg-neon text-fondo">Oferta</span>}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        {categoria && (
          <span className="font-display text-xs font-semibold uppercase tracking-wider text-apagado">{limpiarHtml(categoria.name)}</span>
        )}
        <h3 className="font-sans font-medium leading-snug text-texto transition group-hover:text-white">{limpiarHtml(producto.name)}</h3>
        {variable && (
          <span className="text-xs font-medium text-neon">
            {producto.variations.length} {NOMBRE_OPCIONES[atributo.toLowerCase()] ?? 'opciones'} disponibles
          </span>
        )}
        <Precio
          monto={variable ? (prices.price_range?.min_amount ?? prices.price) : prices.price}
          moneda={prices}
          desde={variable && prices.price_range?.min_amount !== prices.price_range?.max_amount}
          antes={!variable && producto.on_sale ? prices.regular_price : undefined}
          className="mt-auto pt-3"
        />
      </div>
    </Link>
  );
}
