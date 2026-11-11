'use server';
/**
 * Server Actions: funciones que se ejecutan en el servidor cuando se envía un
 * formulario. Reemplazan a una API propia: el formulario llama directamente a
 * estas funciones y Next.js se encarga del resto.
 */
import { redirect } from 'next/navigation';
import { refresh, updateTag } from 'next/cache';
import { agregarAlCarrito, actualizarItem, quitarItem, realizarPedido, ETIQUETA_CATALOGO } from './woo';
import { esquemaCheckout, erroresPorCampo } from './validacion';

export interface EstadoFormulario {
  error?: string;
  /** Errores por campo, p. ej. { email: 'Escribe un correo válido' }. */
  errores?: Record<string, string>;
  /** Lo que escribió el cliente, para volver a mostrarlo si hubo un error. */
  valores?: Record<string, string>;
}

function mensajeDe(e: unknown, porDefecto: string) {
  return e instanceof Error ? e.message : porDefecto;
}

/** Entero positivo o null (no se confía en lo que manda el navegador). */
function entero(valor: FormDataEntryValue | null, min: number, max: number) {
  const n = Number(valor);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

/* ---------- Carrito ---------- */

export async function agregarAction(_prev: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  // `id` es el producto simple o la variación elegida (edición / color).
  const id = entero(form.get('id'), 1, Number.MAX_SAFE_INTEGER);
  const cantidad = entero(form.get('cantidad'), 1, 99);
  if (!id) return { error: 'Elige una opción antes de añadir al carrito.' };
  if (!cantidad) return { error: 'La cantidad debe estar entre 1 y 99.' };

  try {
    await agregarAlCarrito(id, cantidad);
  } catch (e) {
    return { error: mensajeDe(e, 'No se pudo añadir al carrito') };
  }
  redirect('/carrito');
}

export async function actualizarAction(form: FormData) {
  const key = String(form.get('key') ?? '');
  const cantidad = entero(form.get('cantidad'), 0, 99) ?? 0;
  try {
    if (cantidad === 0) await quitarItem(key);
    else await actualizarItem(key, cantidad);
  } catch (e) {
    redirect(`/carrito?error=${encodeURIComponent(mensajeDe(e, 'No se pudo actualizar el carrito'))}`);
  }
  refresh();
}

export async function quitarAction(form: FormData) {
  try {
    await quitarItem(String(form.get('key') ?? ''));
  } catch (e) {
    redirect(`/carrito?error=${encodeURIComponent(mensajeDe(e, 'No se pudo quitar el producto'))}`);
  }
  refresh();
}

/* ---------- Checkout ---------- */

export async function checkoutAction(_prev: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const valores = Object.fromEntries(
    [...form.entries()].filter(([k, v]) => !k.startsWith('$') && typeof v === 'string')
  ) as Record<string, string>;

  // 1. Validación en el servidor (nunca confiar solo en la del navegador).
  const resultado = esquemaCheckout.safeParse(valores);
  if (!resultado.success) {
    return { error: 'Revisa los campos marcados.', errores: erroresPorCampo(resultado.error), valores };
  }
  const { payment_method, nota, ...cliente } = resultado.data;

  // 2. WooCommerce crea el pedido. Con tarjeta, devuelve la URL de pago de Recurrente.
  let destino: string;
  try {
    const pedido = await realizarPedido(cliente, payment_method, nota);
    const confirmacion = `/pedido/${pedido.order_id}?key=${encodeURIComponent(pedido.order_key)}`;
    const { redirect_url } = pedido.payment_result;
    // Si la pasarela pide redirigir a su página de pago, vamos allá. La página de
    // "pedido recibido" de WordPress no se usa: tenemos la nuestra.
    destino = redirect_url && !redirect_url.includes('order-received') ? redirect_url : confirmacion;
  } catch (e) {
    return { error: mensajeDe(e, 'No se pudo crear el pedido'), valores };
  }

  // 3. El stock cambió: el catálogo en caché deja de ser válido para todos.
  updateTag(ETIQUETA_CATALOGO);

  // redirect() funciona lanzando una excepción especial: va fuera del try/catch.
  redirect(destino);
}
