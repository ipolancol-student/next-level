'use client';
/**
 * Formulario "Añadir al carrito". Sirve para productos simples y para productos
 * con variaciones (edición o color): el cliente elige una opción y se envía el
 * ID de esa variación, con su propio precio y stock.
 */
import { useActionState, useState } from 'react';
import { agregarAction } from '@/lib/acciones';

export interface OpcionCompra {
  variacionId: number;
  nombre: string;
  precio: string;
  precioAntes?: string;
  precioUsd: string;
  enStock: boolean;
  stockTexto?: string;
}

type Props =
  | { tipo: 'simple'; id: number; maximo: number }
  | { tipo: 'variable'; atributo: string; opciones: OpcionCompra[]; porDefecto: number };

export function FormularioCompra(props: Props) {
  const [estado, accion, enviando] = useActionState(agregarAction, {});
  const opciones = props.tipo === 'variable' ? props.opciones : [];
  const [elegida, setElegida] = useState(() =>
    props.tipo === 'variable'
      ? (opciones.find((o) => o.variacionId === props.porDefecto && o.enStock) ?? opciones.find((o) => o.enStock))?.variacionId
      : undefined
  );
  const opcion = opciones.find((o) => o.variacionId === elegida);
  const id = props.tipo === 'simple' ? props.id : elegida;
  const sinStock = props.tipo === 'variable' && !opcion;

  return (
    <form action={accion} className="mt-5 space-y-5 first:mt-0">
      {props.tipo === 'variable' && (
        <fieldset>
          <legend className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-apagado">Elige {props.atributo.toLowerCase()}</legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {opciones.map((o) => (
              <label
                key={o.variacionId}
                className={`flex cursor-pointer flex-col rounded-xl border-2 bg-fondo px-4 py-3 text-sm transition has-checked:border-marca has-checked:bg-marca-claro has-checked:shadow-lg has-checked:shadow-marca/20 has-disabled:cursor-not-allowed has-disabled:opacity-40 ${
                  o.enStock ? 'border-borde hover:border-borde-fuerte' : 'border-dashed border-borde'
                }`}
              >
                <input
                  type="radio"
                  name="opcion"
                  value={o.variacionId}
                  checked={elegida === o.variacionId}
                  onChange={() => setElegida(o.variacionId)}
                  disabled={!o.enStock}
                  className="sr-only"
                />
                <span className="font-display font-bold uppercase tracking-wide">{o.nombre}</span>
                <span className="text-tenue">{o.enStock ? o.precio : 'Agotado'}</span>
              </label>
            ))}
          </div>

          {opcion && (
            <div className="mt-5" aria-live="polite">
              <p className="flex flex-wrap items-baseline gap-x-2 font-display text-4xl">
                <span className="font-bold">{opcion.precio}</span>
                {opcion.precioAntes && <span className="text-lg text-apagado line-through">{opcion.precioAntes}</span>}
              </p>
              <p className="text-apagado">≈ {opcion.precioUsd}</p>
              {opcion.stockTexto && (
                <p className="mt-2 flex items-center gap-2 text-sm text-tenue">
                  <span className="size-2 rounded-full bg-neon" aria-hidden="true" />
                  {opcion.stockTexto}
                </p>
              )}
            </div>
          )}
        </fieldset>
      )}

      {/* El servidor recibe el producto simple o la variación elegida. */}
      <input type="hidden" name="id" value={id ?? ''} />

      {sinStock ? (
        <p className="rounded-xl border border-borde bg-fondo px-4 py-3 font-display font-semibold uppercase tracking-wider text-tenue">Todas las opciones están agotadas</p>
      ) : (
        <div className="flex items-stretch gap-3">
          <label className="sr-only" htmlFor="cantidad">Cantidad</label>
          <input
            id="cantidad"
            name="cantidad"
            type="number"
            min={1}
            max={props.tipo === 'simple' && props.maximo > 0 ? Math.min(props.maximo, 99) : 99}
            defaultValue={1}
            className="w-20 rounded-xl border border-borde bg-fondo px-3 text-center font-display text-lg font-bold focus:border-marca focus:outline-none"
          />
          <button
            disabled={enviando || !id}
            className="boton-primario flex-1"
          >
            {enviando ? 'Añadiendo…' : 'Añadir al carrito'}
          </button>
        </div>
      )}

      {estado.error && (
        <p className="rounded-xl border border-alerta/40 bg-alerta/10 px-4 py-2.5 text-sm text-alerta" role="alert">{estado.error}</p>
      )}
    </form>
  );
}
