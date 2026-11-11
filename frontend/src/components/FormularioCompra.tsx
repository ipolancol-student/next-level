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
    <form action={accion} className="mt-6 space-y-5">
      {props.tipo === 'variable' && (
        <fieldset>
          <legend className="text-sm font-semibold">{props.atributo}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {opciones.map((o) => (
              <label
                key={o.variacionId}
                className={`cursor-pointer rounded-xl border-2 px-4 py-2 text-sm transition has-checked:border-marca has-checked:bg-marca-claro has-disabled:cursor-not-allowed has-disabled:opacity-40 ${
                  o.enStock ? 'border-neutral-200 hover:border-neutral-400' : 'border-dashed border-neutral-300 line-through'
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
                <span className="font-medium">{o.nombre}</span>
                <span className="ml-2 text-neutral-500">{o.precio}</span>
              </label>
            ))}
          </div>

          {opcion && (
            <div className="mt-4" aria-live="polite">
              <p className="text-3xl">
                {opcion.precioAntes && <span className="mr-2 text-lg text-neutral-400 line-through">{opcion.precioAntes}</span>}
                <span className="font-semibold">{opcion.precio}</span>
              </p>
              <p className="text-neutral-500">≈ {opcion.precioUsd}</p>
              {opcion.stockTexto && <p className="mt-1 text-sm text-neutral-500">{opcion.stockTexto}</p>}
            </div>
          )}
        </fieldset>
      )}

      {/* El servidor recibe el producto simple o la variación elegida. */}
      <input type="hidden" name="id" value={id ?? ''} />

      {sinStock ? (
        <p className="rounded-lg bg-neutral-100 px-4 py-3 font-medium text-neutral-700">Todas las opciones están agotadas.</p>
      ) : (
        <div className="flex items-center gap-3">
          <label className="sr-only" htmlFor="cantidad">Cantidad</label>
          <input
            id="cantidad"
            name="cantidad"
            type="number"
            min={1}
            max={props.tipo === 'simple' && props.maximo > 0 ? Math.min(props.maximo, 99) : 99}
            defaultValue={1}
            className="w-20 rounded-lg border border-neutral-300 px-3 py-2"
          />
          <button
            disabled={enviando || !id}
            className="rounded-full bg-marca px-6 py-2.5 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60"
          >
            {enviando ? 'Añadiendo…' : 'Añadir al carrito'}
          </button>
        </div>
      )}

      {estado.error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">{estado.error}</p>
      )}
    </form>
  );
}
