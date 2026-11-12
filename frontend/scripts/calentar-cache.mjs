/**
 * "Calienta" la caché de la tienda: visita todas las páginas del sitemap para que
 * Next.js guarde el catálogo y ningún visitante tenga que esperar a WordPress.
 * Útil antes de una presentación o después de publicar en Vercel.
 *
 * Uso (desde frontend/):
 *   npm run calentar                         → http://localhost:3000
 *   npm run calentar -- https://mi-tienda.vercel.app
 *
 * Las páginas se visitan de una en una: WordPress Studio atiende pocas peticiones a la vez.
 */
const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/+$/, '');

async function visitar(url) {
  const inicio = performance.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    await res.text(); // esperar todo el streaming
    return { ok: res.ok, estado: res.status, ms: performance.now() - inicio };
  } catch (e) {
    return { ok: false, estado: e.name, ms: performance.now() - inicio };
  }
}

const sitemap = await fetch(`${base}/sitemap.xml`).then((r) => r.text()).catch(() => '');
// El sitemap trae las URLs públicas (SITE_URL); se visitan contra la base indicada.
const rutas = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1].replace(/&amp;/g, '&')).pathname + new URL(m[1].replace(/&amp;/g, '&')).search);
if (rutas.length === 0) {
  console.error(`No se pudo leer ${base}/sitemap.xml. ¿Está encendida la tienda y WordPress?`);
  process.exit(1);
}

console.log(`Calentando ${rutas.length} páginas de ${base}…`);
let fallos = 0;
let total = 0;
for (const [i, ruta] of rutas.entries()) {
  const r = await visitar(base + ruta);
  total += r.ms;
  if (!r.ok) fallos++;
  console.log(`${String(i + 1).padStart(3)}/${rutas.length} ${r.ok ? '✔' : '✘'} ${(r.ms / 1000).toFixed(1).padStart(5)} s  ${ruta}`);
}
console.log(`\nListo en ${(total / 1000).toFixed(0)} s · ${rutas.length - fallos} páginas en caché${fallos ? ` · ${fallos} con error` : ''}.`);
process.exit(fallos ? 1 : 0);
