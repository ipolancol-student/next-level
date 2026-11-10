// Se muestra cuando no se puede hablar con WordPress, con pasos para arreglarlo.
export function AvisoConexion({ error }: { error: unknown }) {
  const mensaje = error instanceof Error ? error.message : String(error);
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
      <h2 className="text-lg font-semibold">No se pudo conectar con WordPress</h2>
      <p className="mt-1 text-sm">{mensaje}</p>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
        <li>Abre WordPress Studio (o LocalWP) y comprueba que tu sitio esté encendido.</li>
        <li>
          Crea el archivo <code>frontend/.env.local</code> copiando <code>.env.example</code> y pon tu URL en{' '}
          <code>WP_URL</code>.
        </li>
        <li>En WordPress: instala y activa <strong>WooCommerce</strong>.</li>
        <li>En <em>Ajustes → Enlaces permanentes</em> elige <strong>&quot;Nombre de la entrada&quot;</strong> y guarda.</li>
        <li>Reinicia <code>npm run dev</code> después de cambiar el <code>.env.local</code>.</li>
      </ol>
    </div>
  );
}
