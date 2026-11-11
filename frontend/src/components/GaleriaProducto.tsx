'use client';
import { useState, type ReactNode } from 'react';
import Image from 'next/image';

interface Props {
  imagenes: { id: number; src: string; alt: string }[];
  nombre: string;
  /** vertical = carátula de juego (3:4); horizontal = consolas y accesorios (4:3). */
  formato?: 'vertical' | 'horizontal';
  /** Lo que se muestra si el producto no tiene fotos (la portada generada). */
  children: ReactNode;
}

/** Foto principal + miniaturas. Las fotos se suben en WordPress → Producto → Galería. */
export function GaleriaProducto({ imagenes, nombre, formato = 'vertical', children }: Props) {
  const [activa, setActiva] = useState(0);
  const proporcion = formato === 'vertical' ? 'aspect-[3/4] max-h-[42rem]' : 'aspect-[4/3]';
  const marco = `relative overflow-hidden rounded-3xl border border-borde bg-superficie ${proporcion}`;

  if (imagenes.length === 0) {
    return <div className={marco}>{children}</div>;
  }

  const actual = imagenes[Math.min(activa, imagenes.length - 1)];
  return (
    <div className="space-y-3">
      <div className={marco}>
        <Image
          key={actual.id}
          src={actual.src}
          alt={actual.alt || nombre}
          fill
          preload={activa === 0}
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="animate-aparecer object-contain p-4"
        />
      </div>
      {imagenes.length > 1 && (
        <ul className="grid grid-cols-5 gap-2" aria-label="Más fotos">
          {imagenes.slice(0, 10).map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setActiva(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === activa}
                className={`relative block aspect-square w-full overflow-hidden rounded-xl border-2 bg-superficie transition ${
                  i === activa ? 'border-marca' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <Image src={img.src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
