import Link from 'next/link';

export default function NoEncontrado() {
  return (
    <div className="relative mx-auto max-w-2xl overflow-hidden py-20 text-center">
      <p className="font-display text-[9rem] font-bold leading-none text-transparent [-webkit-text-stroke:2px_var(--color-borde-fuerte)]" aria-hidden="true">
        404
      </p>
      <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-neon">Game over</p>
      <h1 className="mt-3 text-4xl font-bold uppercase">Este nivel no existe</h1>
      <p className="mt-3 text-tenue">La página que buscas se movió o nunca existió. Vuelve a la tienda y sigue jugando.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/tienda" className="boton-primario">Ir a la tienda</Link>
        <Link href="/" className="boton-secundario">Inicio</Link>
      </div>
    </div>
  );
}
