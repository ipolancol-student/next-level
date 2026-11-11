'use client';
/**
 * Pantalla para errores inesperados. El detalle técnico queda en los registros
 * del servidor; al cliente solo se le muestra un mensaje claro y un botón para reintentar.
 */
import Link from 'next/link';

export default function ErrorInesperado({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-alerta">Error</p>
      <h1 className="mt-3 text-4xl font-bold uppercase">Algo salió mal</h1>
      <p className="mt-3 text-tenue">Tuvimos un problema al cargar esta página. Inténtalo de nuevo en un momento.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-apagado">Código de referencia: {error.digest}</p>}
      <div className="mt-8 flex justify-center gap-3">
        <button onClick={reset} className="boton-primario">Reintentar</button>
        <Link href="/" className="boton-secundario">Ir al inicio</Link>
      </div>
    </div>
  );
}
