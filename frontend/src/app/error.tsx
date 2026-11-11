'use client';
/**
 * Pantalla para errores inesperados. El detalle técnico queda en los registros
 * del servidor; al cliente solo se le muestra un mensaje claro y un botón para reintentar.
 */
import Link from 'next/link';

export default function ErrorInesperado({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <p className="text-6xl font-bold text-neutral-300">¡Ups!</p>
      <h1 className="mt-4 text-2xl font-semibold">Algo salió mal</h1>
      <p className="mt-2 text-neutral-600">Tuvimos un problema al cargar esta página. Inténtalo de nuevo en un momento.</p>
      {error.digest && <p className="mt-2 text-xs text-neutral-400">Código de referencia: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="rounded-full bg-marca px-6 py-2.5 font-semibold text-white hover:bg-marca-oscuro">
          Reintentar
        </button>
        <Link href="/" className="rounded-full border border-neutral-300 px-6 py-2.5 font-semibold hover:bg-white">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
