import Image from 'next/image';
import type { Producto } from '@/lib/tipos';
import { plataformaDe, tipoDeProducto, limpiarHtml, type TipoProducto } from '@/lib/producto';

// Degradado de cada plataforma para la portada generada.
const ESTILOS: Record<string, string> = {
  ps5: 'from-[#1d4ed8] via-[#0b1f5c] to-[#060914]',
  xbox: 'from-[#16a34a] via-[#0a3a1f] to-[#050c08]',
  switch: 'from-[#e11d48] via-[#5c0a1e] to-[#12050a]',
  'switch-2': 'from-[#f43f5e] via-[#3b0a1a] to-[#0a0508]',
  multiplataforma: 'from-[#8b5cf6] via-[#2a1060] to-[#0b0714]'
};

interface Props {
  producto: Pick<Producto, 'name' | 'images' | 'tags' | 'categories'>;
  /** Portada grande (página de producto) en vez de la de la tarjeta. */
  grande?: boolean;
  /** Prioridad de carga: true para la imagen principal visible al abrir la página (LCP). */
  prioridad?: boolean;
  className?: string;
}

/**
 * Muestra la foto del producto si existe en WordPress. Si no tiene foto,
 * dibuja una portada con el color de la plataforma y un ícono según el tipo
 * (así no usamos carátulas con derechos de autor en el catálogo de prueba).
 */
export function Portada({ producto, grande = false, prioridad = false, className = '' }: Props) {
  const imagen = producto.images[0];
  const nombre = limpiarHtml(producto.name);

  if (imagen) {
    // Carátulas de juegos (verticales): llenan el marco. Consolas, accesorios y tarjetas son
    // fotos de producto con fondo blanco y formas variadas: se muestran completas, sin recortar.
    const caratula = tipoDeProducto(producto) === 'juego';
    // next/image genera versiones WebP/AVIF del tamaño justo para cada pantalla.
    // El contenedor del componente debe ser `relative` y tener tamaño.
    return (
      <div className={`absolute inset-0 ${caratula ? '' : 'bg-white'}`}>
        <Image
          src={imagen.src}
          alt={imagen.alt || nombre}
          fill
          sizes={grande ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'}
          preload={prioridad}
          className={`${caratula ? 'object-cover' : 'object-contain p-[8%]'} ${className}`}
        />
      </div>
    );
  }

  const plataforma = plataformaDe(producto);
  const tipo = tipoDeProducto(producto);
  // "Mario Kart World – Nintendo Switch 2" → "Mario Kart World"; "Consola Xbox Series X" → "Xbox Series X"
  const titulo = nombre.split(' – ')[0].replace(/^(Consola|Tarjeta de regalo)\s+/, '');

  return (
    <div
      role="img"
      aria-label={nombre}
      className={`relative flex size-full flex-col justify-between overflow-hidden bg-linear-to-br p-[8%] text-white ${ESTILOS[plataforma.id]} ${className}`}
    >
      {/* textura de rejilla y brillo */}
      <div className="rejilla pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-1/4 -top-1/4 size-3/4 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />

      <span className={`chip relative self-start bg-black/40 text-white backdrop-blur ${grande ? 'text-xs' : ''}`}>
        {plataforma.nombre}
      </span>
      <Icono tipo={tipo} grande={grande} />
      <span className={`relative font-display font-bold uppercase leading-tight drop-shadow-lg ${grande ? 'text-4xl' : 'text-lg'}`}>
        {titulo}
      </span>
    </div>
  );
}

function Icono({ tipo, grande }: { tipo: TipoProducto; grande: boolean }) {
  // En la portada grande el ícono sube un poco para no tapar el título.
  const clase = `absolute right-[-10%] -translate-y-1/2 text-white/15 ${grande ? 'top-[40%] w-2/3' : 'top-1/2 w-2/3'}`;
  switch (tipo) {
    case 'juego': // disco
      return (
        <svg viewBox="0 0 40 40" aria-hidden="true" className={clase} fill="currentColor">
          <path fillRule="evenodd" d="M20 0a20 20 0 1 1 0 40 20 20 0 0 1 0-40Zm0 14a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
        </svg>
      );
    case 'consola': // consola de sobremesa
      return (
        <svg viewBox="0 0 48 40" aria-hidden="true" className={clase} fill="currentColor">
          <path d="M6 4h36a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Zm4 8v12h28V12H10Zm4 24h20v2H14z" />
        </svg>
      );
    case 'tarjeta': // tarjeta de regalo
      return (
        <svg viewBox="0 0 48 32" aria-hidden="true" className={clase} fill="currentColor">
          <path fillRule="evenodd" d="M4 0h40a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4Zm0 8v4h40V8H4Zm4 12v4h12v-4H8Z" />
        </svg>
      );
    default: // control
      return (
        <svg viewBox="0 0 64 40" aria-hidden="true" className={clase} fill="currentColor">
          <path d="M16 4h32c8 0 14 9 15 22 1 9-5 13-10 9l-7-7H18l-7 7c-5 4-11 0-10-9C2 13 8 4 16 4Zm2 8v5h-5v4h5v5h4v-5h5v-4h-5v-5h-4Zm27 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm6-5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
        </svg>
      );
  }
}
