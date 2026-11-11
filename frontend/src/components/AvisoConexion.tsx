// Se muestra cuando no se puede hablar con WordPress, con pasos para arreglarlo.
export function AvisoConexion({ error }: { error: unknown }) {
  const mensaje = error instanceof Error ? error.message : String(error);
  return (
    <div className="rounded-2xl border border-alerta/40 bg-alerta/10 p-6">
      <h2 className="font-display text-lg font-bold uppercase tracking-wide text-alerta">No se pudo conectar con la tienda</h2>
      <p className="mt-1 text-sm text-tenue">{mensaje}</p>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-tenue">
        <li>Comprueba que el sitio de WordPress esté encendido (WordPress Studio o el túnel público).</li>
        <li>Revisa <code className="text-texto">WP_URL</code> en <code className="text-texto">frontend/.env.local</code> (o en las variables de Vercel).</li>
        <li>En WordPress: WooCommerce activo y enlaces permanentes en &quot;Nombre de la entrada&quot;.</li>
      </ol>
    </div>
  );
}
