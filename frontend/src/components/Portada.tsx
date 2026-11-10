/* eslint-disable @next/next/no-img-element -- las imágenes vienen de WordPress (ver README) */
import { plataformaDe, esVideojuego, limpiarHtml, type Producto } from '@/lib/woo';

// Colores de cada plataforma para la portada generada.
const ESTILOS: Record<string, string> = {
  ps5: 'from-blue-600 via-blue-800 to-slate-950',
  xbox: 'from-green-500 via-green-800 to-neutral-950',
  switch: 'from-red-500 via-red-700 to-neutral-950',
  'switch-2': 'from-rose-600 via-neutral-800 to-neutral-950',
  multiplataforma: 'from-violet-500 via-indigo-800 to-neutral-950'
};

interface Props {
  producto: Pick<Producto, 'name' | 'images' | 'tags' | 'categories'>;
  /** Usar la imagen grande (página de producto) en vez de la miniatura. */
  grande?: boolean;
  className?: string;
}

/**
 * Muestra la foto del producto si existe en WordPress. Si no tiene foto,
 * dibuja una portada con el color de la plataforma (así no usamos carátulas
 * con derechos de autor en el catálogo de prueba).
 */
export function Portada({ producto, grande = false, className = '' }: Props) {
  const imagen = producto.images[0];
  const nombre = limpiarHtml(producto.name);

  if (imagen) {
    return (
      <img
        src={grande ? imagen.src : imagen.thumbnail || imagen.src}
        alt={imagen.alt || nombre}
        loading={grande ? undefined : 'lazy'}
        className={`size-full object-cover ${className}`}
      />
    );
  }

  const plataforma = plataformaDe(producto);
  const juego = esVideojuego(producto);
  // "Mario Kart World – Nintendo Switch 2" → "Mario Kart World"
  const titulo = nombre.split(' – ')[0];

  return (
    <div
      role="img"
      aria-label={nombre}
      className={`relative flex size-full flex-col justify-between overflow-hidden bg-linear-to-br p-[8%] text-white ${ESTILOS[plataforma.id]} ${className}`}
    >
      <span className={`self-start rounded bg-white/15 px-2 py-0.5 font-semibold uppercase tracking-wider backdrop-blur ${grande ? 'text-sm' : 'text-[0.65rem]'}`}>
        {plataforma.nombre}
      </span>
      {juego ? <IconoDisco grande={grande} /> : <IconoControl grande={grande} />}
      <span className={`font-bold leading-tight drop-shadow ${grande ? 'text-3xl' : 'text-base'}`}>{titulo}</span>
    </div>
  );
}

function IconoControl({ grande }: { grande: boolean }) {
  return (
    <svg
      viewBox="0 0 64 40"
      aria-hidden="true"
      className={`absolute right-[-8%] top-1/2 -translate-y-1/2 text-white/15 ${grande ? 'w-3/4' : 'w-2/3'}`}
      fill="currentColor"
    >
      <path d="M16 4h32c8 0 14 9 15 22 1 9-5 13-10 9l-7-7H18l-7 7c-5 4-11 0-10-9C2 13 8 4 16 4Zm2 8v5h-5v4h5v5h4v-5h5v-4h-5v-5h-4Zm27 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm6-5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
    </svg>
  );
}

function IconoDisco({ grande }: { grande: boolean }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={`absolute right-[-12%] top-1/2 -translate-y-1/2 text-white/15 ${grande ? 'w-2/3' : 'w-3/5'}`}
      fill="currentColor"
    >
      <path fillRule="evenodd" d="M20 0a20 20 0 1 1 0 40 20 20 0 0 1 0-40Zm0 14a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
    </svg>
  );
}
