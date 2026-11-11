/**
 * Validación del checkout con Zod. Se valida en el servidor (Server Action)
 * antes de enviar nada a WooCommerce; los mensajes se muestran junto a cada campo.
 */
import { z } from 'zod';

const texto = (min: number, max: number, mensaje: string) =>
  z.string().trim().min(min, mensaje).max(max, `Máximo ${max} caracteres`);

export const esquemaCheckout = z
  .object({
    first_name: texto(2, 60, 'Escribe tu nombre'),
    last_name: texto(2, 60, 'Escribe tu apellido'),
    email: z.string().trim().toLowerCase().pipe(z.email('Escribe un correo válido')),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s-]{8,20}$/, 'Escribe un teléfono válido (mínimo 8 dígitos)'),
    address_1: texto(5, 120, 'Escribe tu dirección completa'),
    city: texto(2, 60, 'Escribe tu ciudad o municipio'),
    state: z.string().trim().max(10).default(''),
    postcode: z.string().trim().max(10).default(''),
    country: z.string().trim().length(2, 'Elige un país'),
    payment_method: z.string().trim().min(1, 'Elige un método de pago'),
    nota: z.string().trim().max(500, 'La nota no puede pasar de 500 caracteres').default('')
  })
  .superRefine((datos, ctx) => {
    // WooCommerce exige departamento en Guatemala y estado + ZIP en EE. UU.
    if ((datos.country === 'GT' || datos.country === 'US') && !datos.state) {
      ctx.addIssue({ code: 'custom', path: ['state'], message: 'Elige una opción' });
    }
    if (datos.country === 'US' && !/^\d{5}(-\d{4})?$/.test(datos.postcode)) {
      ctx.addIssue({ code: 'custom', path: ['postcode'], message: 'ZIP code de 5 dígitos' });
    }
  });

export type DatosCheckout = z.infer<typeof esquemaCheckout>;

/** { campo: 'mensaje' } con el primer error de cada campo. */
export function erroresPorCampo(error: z.ZodError) {
  const errores: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? 'formulario');
    errores[campo] ??= issue.message;
  }
  return errores;
}
