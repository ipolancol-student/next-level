/**
 * POST /api/revalidar — WordPress avisa que cambió el catálogo o una página.
 *
 * Seguridad: el cuerpo viene firmado con HMAC-SHA256 (REVALIDATE_SECRET) y un
 * timestamp de máximo 5 minutos. Sin firma válida no se invalida nada.
 * Cuerpo: { "etiquetas": ["catalogo"] }
 */
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { env } from '@/lib/env';
import { verificarFirma } from '@/lib/firma';

const ETIQUETAS_PERMITIDAS = ['catalogo', 'paginas'] as const;
const esquema = z.object({ etiquetas: z.array(z.enum(ETIQUETAS_PERMITIDAS)).min(1).max(5) });

export async function POST(request: Request) {
  const { REVALIDATE_SECRET } = env();
  if (!REVALIDATE_SECRET) {
    return Response.json({ error: 'REVALIDATE_SECRET no está configurado' }, { status: 503 });
  }

  const cuerpo = await request.text();
  const valida = verificarFirma({
    secreto: REVALIDATE_SECRET,
    firma: request.headers.get('x-nextlevel-firma'),
    timestamp: request.headers.get('x-nextlevel-timestamp'),
    cuerpo
  });
  if (!valida) {
    return Response.json({ error: 'Firma inválida o vencida' }, { status: 401 });
  }

  let datos: z.infer<typeof esquema>;
  try {
    datos = esquema.parse(JSON.parse(cuerpo));
  } catch {
    return Response.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  // "max" = stale-while-revalidate: la siguiente visita recibe al instante la versión
  // anterior y Next.js pide la nueva a WordPress en segundo plano. Así ningún visitante
  // espera los segundos que tarda WordPress. El stock real lo vuelve a validar
  // WooCommerce al añadir al carrito y al pagar, por lo que no hay sobreventa.
  for (const etiqueta of new Set(datos.etiquetas)) {
    revalidateTag(etiqueta, 'max');
  }
  return Response.json({ revalidado: datos.etiquetas, fecha: new Date().toISOString() });
}
