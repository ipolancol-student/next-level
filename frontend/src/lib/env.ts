/**
 * Variables de entorno validadas con Zod.
 *
 * Si falta una variable obligatoria o tiene un formato inválido, la aplicación
 * lo dice con un mensaje claro en vez de fallar más adelante de forma confusa.
 * Solo se usa en el servidor: ninguna de estas variables llega al navegador.
 */
import { z } from 'zod';

const sinBarraFinal = (url: string) => url.replace(/\/+$/, '');

const esquema = z.object({
  /** WordPress + WooCommerce (backend). */
  WP_URL: z.url({ message: 'WP_URL debe ser una URL completa, p. ej. http://localhost:8881' }).transform(sinBarraFinal),
  /** URL pública de esta tienda (SEO, sitemap y regreso desde la pasarela de pago). */
  SITE_URL: z.url({ message: 'SITE_URL debe ser una URL completa' }).transform(sinBarraFinal),
  /** Secreto compartido con WordPress para invalidar la caché del catálogo. */
  REVALIDATE_SECRET: z.string().min(16, 'REVALIDATE_SECRET debe tener al menos 16 caracteres').optional(),
  /** Quetzales por 1 US$ si el Banco de Guatemala no responde. */
  TIPO_CAMBIO_RESPALDO: z.coerce.number().positive().default(7.7)
});

export type Env = z.infer<typeof esquema>;

let cache: Env | null = null;

export function env(): Env {
  if (cache) return cache;

  // Las variables vacías ("") se tratan como no definidas.
  const vacioAIndefinido = (valor: string | undefined) => (valor?.trim() ? valor.trim() : undefined);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  const resultado = esquema.safeParse({
    WP_URL: vacioAIndefinido(process.env.WP_URL),
    SITE_URL:
      vacioAIndefinido(process.env.SITE_URL) ?? (vercel ? `https://${vercel}` : 'http://localhost:3000'),
    REVALIDATE_SECRET: vacioAIndefinido(process.env.REVALIDATE_SECRET),
    TIPO_CAMBIO_RESPALDO: vacioAIndefinido(process.env.TIPO_CAMBIO_RESPALDO)
  });

  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((i) => `${i.path.join('.') || 'env'}: ${i.message}`)
      .join('; ');
    throw new Error(`Configuración inválida en .env.local → ${detalle}`);
  }
  cache = resultado.data;
  return cache;
}
