'use client';
// Componente de cliente: necesita useActionState para mostrar el error y el estado "Añadiendo…".
import { useActionState } from 'react';
import { agregarAction } from '@/lib/acciones';

interface Props {
  id: number;
  minimo: number;
  maximo: number;
}

export function BotonAgregar({ id, minimo, maximo }: Props) {
  const [estado, accion, enviando] = useActionState(agregarAction, {});

  return (
    <form action={accion} className="mt-6">
      <input type="hidden" name="id" value={id} />
      <div className="flex items-center gap-3">
        <label className="sr-only" htmlFor="cantidad">Cantidad</label>
        <input
          id="cantidad"
          name="cantidad"
          type="number"
          min={minimo || 1}
          max={maximo > 0 ? maximo : undefined}
          defaultValue={1}
          className="w-20 rounded-lg border border-neutral-300 px-3 py-2"
        />
        <button
          disabled={enviando}
          className="rounded-full bg-marca px-6 py-2.5 font-medium text-white hover:bg-marca-oscuro disabled:opacity-60"
        >
          {enviando ? 'Añadiendo…' : 'Añadir al carrito'}
        </button>
      </div>
      {estado.error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">{estado.error}</p>
      )}
    </form>
  );
}
