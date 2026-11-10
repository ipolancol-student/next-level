// Cualquier página creada en WordPress (Páginas → Añadir) aparece aquí:
// /sobre-nosotros, /politica-de-privacidad, /contacto…
// Las rutas fijas (/tienda, /carrito, /checkout) tienen prioridad sobre esta.
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPagina } from '@/lib/wordpress';
import { limpiarHtml } from '@/lib/woo';
import { BloqueCargando } from '@/components/Cargando';

export async function generateMetadata({ params }: PageProps<'/[slug]'>): Promise<Metadata> {
  const pagina = await getPagina((await params).slug);
  if (!pagina) return {};
  return {
    // Si Yoast SEO define un título, se usa tal cual (ya incluye el nombre del sitio).
    title: pagina.seo.title ? { absolute: limpiarHtml(pagina.seo.title) } : limpiarHtml(pagina.titulo),
    description: pagina.seo.description
  };
}

export default function PaginaWordPress({ params }: PageProps<'/[slug]'>) {
  return (
    <Suspense fallback={<BloqueCargando />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: Promise<{ slug: string }> }) {
  const pagina = await getPagina((await params).slug);
  if (!pagina) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight" dangerouslySetInnerHTML={{ __html: pagina.titulo }} />
      <div className="contenido-wp mt-6" dangerouslySetInnerHTML={{ __html: pagina.contenido }} />
    </article>
  );
}
