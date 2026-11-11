'use client';
import { useState, type ReactNode } from 'react';
import Image from 'next/image';

interface Props {
  imagenes: { id: number; src: string; alt: string }[];
  nombre: string;
  /** Lo que se muestra si el producto no tiene fotos (la portada generada). */
  children: ReactNode;
}

/** Foto principal + miniaturas. Las fotos se suben en WordPress → Producto → Galería. */
export function GaleriaProducto({ imagenes, nombre, children }: Props) {
  const [activa, setActiva] = useState(0);

  if (imagenes.length === 0) {
    return <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-neutral-200">{children}</div>;
  }

  const actual = imagenes[Math.min(activa, imagenes.length - 1)];
  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <Image
          key={actual.id}
          src={actual.src}
          alt={actual.alt || nombre}
          fill
          preload={activa === 0}
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-contain"
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
                className={`relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-white transition ${
                  i === activa ? 'border-marca' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <Image src={img.src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
