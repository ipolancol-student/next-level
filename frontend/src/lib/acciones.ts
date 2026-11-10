'use server';
/**
 * Server Actions: funciones que se ejecutan en el servidor cuando se envía un
 * formulario. Reemplazan a una API propia: el formulario llama directamente a
 * estas funciones y Next.js se encarga del resto.
 */
import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import { agregarAlCarrito, actualizarItem, quitarItem, realizarPedido, type DatosCliente } from './woo';

export interface EstadoFormulario {
  error?: string;
  /** Lo que escribió el cliente, para volver a mostrarlo si hubo un error. */
  valores?: Record<string, string>;
}

function mensajeDe(e: unknown, porDefecto: string) {
  return e instanceof Error ? e.message : porDefecto;
}

/* ---------- Carrito ---------- */

export async function agregarAction(_prev: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const id = Number(form.get('id'));
  const cantidad = Math.max(1, Number(form.get('cantidad')) || 1);
  try {
    await agregarAlCarrito(id, cantidad);
  } catch (e) {
    return { error: mensajeDe(e, 'No se pudo añadir al carrito') };
  }
  redirect('/carrito');
}

export async function actualizarAction(form: FormData) {
  const key = String(form.get('key'));
  const cantidad = Math.max(0, Number(form.get('cantidad')) || 0);
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
    await quitarItem(String(form.get('key')));
  } catch (e) {
    redirect(`/carrito?error=${encodeURIComponent(mensajeDe(e, 'No se pudo quitar el producto'))}`);
  }
  refresh();
}

/* ---------- Checkout ---------- */

const CAMPOS: (keyof DatosCliente)[] = [
  'first_name', 'last_name', 'email', 'phone', 'address_1', 'city', 'state', 'postcode', 'country'
];

export async function checkoutAction(_prev: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const cliente = Object.fromEntries(
    CAMPOS.map((k) => [k, String(form.get(k) ?? '').trim()])
  ) as unknown as DatosCliente;
  const metodoPago = String(form.get('payment_method') ?? '');
  const nota = String(form.get('nota') ?? '');

  let destino: string;
  try {
    const pedido = await realizarPedido(cliente, metodoPago, nota);
    const { payment_status, redirect_url } = pedido.payment_result;
    // Pasarelas externas (PayPal, etc.) devuelven una URL a la que hay que enviar al cliente.
    destino =
      payment_status !== 'success' && redirect_url ? redirect_url : `/gracias?pedido=${pedido.order_id}`;
  } catch (e) {
    return {
      error: mensajeDe(e, 'No se pudo crear el pedido'),
      valores: { ...cliente, payment_method: metodoPago, nota }
    };
  }
  // redirect() funciona lanzando una excepción especial: va fuera del try/catch.
  redirect(destino);
}
