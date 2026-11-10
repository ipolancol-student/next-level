'use client';
import { useActionState, useState } from 'react';
import { checkoutAction } from '@/lib/acciones';

const PAISES: [string, string][] = [
  ['GT', 'Guatemala'], ['SV', 'El Salvador'], ['HN', 'Honduras'], ['NI', 'Nicaragua'], ['CR', 'Costa Rica'],
  ['PA', 'Panamá'], ['BZ', 'Belice'], ['MX', 'México'], ['US', 'Estados Unidos'], ['CO', 'Colombia'],
  ['ES', 'España']
];

// Países donde WooCommerce exige elegir de una lista (usa códigos, no nombres).
const REGIONES: Record<string, { etiqueta: string; opciones: [string, string][] }> = {
  GT: {
    etiqueta: 'Departamento',
    opciones: [
      ['GT-AV', 'Alta Verapaz'], ['GT-BV', 'Baja Verapaz'], ['GT-CM', 'Chimaltenango'], ['GT-CQ', 'Chiquimula'],
      ['GT-PR', 'El Progreso'], ['GT-ES', 'Escuintla'], ['GT-GU', 'Guatemala'], ['GT-HU', 'Huehuetenango'],
      ['GT-IZ', 'Izabal'], ['GT-JA', 'Jalapa'], ['GT-JU', 'Jutiapa'], ['GT-PE', 'Petén'],
      ['GT-QZ', 'Quetzaltenango'], ['GT-QC', 'Quiché'], ['GT-RE', 'Retalhuleu'], ['GT-SA', 'Sacatepéquez'],
      ['GT-SM', 'San Marcos'], ['GT-SR', 'Santa Rosa'], ['GT-SO', 'Sololá'], ['GT-SU', 'Suchitepéquez'],
      ['GT-TO', 'Totonicapán'], ['GT-ZA', 'Zacapa']
    ]
  },
  US: {
    etiqueta: 'Estado',
    opciones: [
      ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
      ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
      ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
      ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
      ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
      ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
      ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
      ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
      ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
      ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
      ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming']
    ]
  }
};

interface Props {
  paisPorDefecto: string;
  metodos: { id: string; nombre: string }[];
  lineas: { key: string; nombre: string; cantidad: number; total: string }[];
  envio: string | null;
  total: string;
  totalUsd: string;
}

const campo = 'mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 focus:outline-2 focus:outline-marca';

export function FormularioCheckout({ paisPorDefecto, metodos, lineas, envio, total, totalUsd }: Props) {
  // React 19 vacía el formulario después de cada envío. Si WooCommerce rechaza el
  // pedido, la acción devuelve lo que escribió el cliente y lo usamos como valor inicial.
  const [estado, accion, enviando] = useActionState(checkoutAction, {});
  const v = estado.valores ?? {};
  // El país es "controlado" porque el campo de departamento/estado cambia según el país.
  const [pais, setPais] = useState(paisPorDefecto);
  const region = REGIONES[pais];

  return (
    <form action={accion} className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {estado.error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{estado.error}</p>
        )}

        <fieldset className="rounded-xl border border-neutral-200 bg-white p-5">
          <legend className="px-1 font-semibold">Tus datos</legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Nombre<input name="first_name" defaultValue={v.first_name} required autoComplete="given-name" className={campo} /></label>
            <label className="text-sm">Apellido<input name="last_name" defaultValue={v.last_name} required autoComplete="family-name" className={campo} /></label>
            <label className="text-sm">Correo<input name="email" defaultValue={v.email} type="email" required autoComplete="email" className={campo} /></label>
            <label className="text-sm">Teléfono<input name="phone" defaultValue={v.phone} type="tel" required autoComplete="tel" className={campo} /></label>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-neutral-200 bg-white p-5">
          <legend className="px-1 font-semibold">Dirección de envío</legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">Dirección<input name="address_1" defaultValue={v.address_1} required autoComplete="address-line1" placeholder="Calle, número, zona" className={campo} /></label>
            <label className="text-sm">
              País
              <select name="country" value={pais} onChange={(e) => setPais(e.target.value)} className={campo}>
                {PAISES.map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}
              </select>
            </label>
            <label className="text-sm">
              {region?.etiqueta ?? 'Provincia / Estado'}
              {region ? (
                <select name="state" key={`region-${pais}`} defaultValue={v.state ?? ''} required autoComplete="address-level1" className={campo}>
                  <option value="" disabled>Elige una opción</option>
                  {region.opciones.map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}
                </select>
              ) : (
                <input name="state" key="region-texto" defaultValue={v.state} autoComplete="address-level1" className={campo} />
              )}
            </label>
            <label className="text-sm">Ciudad / Municipio<input name="city" defaultValue={v.city} required autoComplete="address-level2" className={campo} /></label>
            <label className="text-sm">
              Código postal {pais === 'US' ? '' : '(opcional)'}
              <input name="postcode" defaultValue={v.postcode} required={pais === 'US'} autoComplete="postal-code" className={campo} />
            </label>
            <label className="text-sm sm:col-span-2">
              Notas del pedido (opcional)
              <textarea name="nota" defaultValue={v.nota} rows={2} placeholder="Ej.: entregar en horario de oficina" className={campo} />
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-neutral-200 bg-white p-5">
          <legend className="px-1 font-semibold">Método de pago</legend>
          {metodos.length === 0 ? (
            <p className="mt-2 text-sm text-red-700">
              No hay métodos de pago activos. Actívalos en WordPress: WooCommerce → Ajustes → Pagos (por ejemplo
              &quot;Contra reembolso&quot; o &quot;Transferencia bancaria&quot;).
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {metodos.map((m, i) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm has-checked:border-marca has-checked:bg-marca-claro"
                >
                  <input type="radio" name="payment_method" value={m.id} defaultChecked={v.payment_method ? v.payment_method === m.id : i === 0} required />
                  {m.nombre}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </div>

      <aside className="h-fit rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold">Tu pedido</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {lineas.map((l) => (
            <li key={l.key} className="flex justify-between gap-4">
              <span><span dangerouslySetInnerHTML={{ __html: l.nombre }} /> × {l.cantidad}</span>
              <span className="whitespace-nowrap">{l.total}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-neutral-200 pt-4 text-sm">
          {envio !== null && (
            <div className="flex justify-between"><dt>Envío a Guatemala</dt><dd>{envio}</dd></div>
          )}
          <div className="flex justify-between pt-1 text-base font-semibold">
            <dt>Total</dt>
            <dd className="text-right">
              {total}
              <span className="block text-xs font-normal text-neutral-500">≈ {totalUsd}</span>
            </dd>
          </div>
        </dl>
        {pais !== 'GT' && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Envío internacional: Q350. Se suma al confirmar el pedido.
          </p>
        )}
        <button
          disabled={enviando || metodos.length === 0}
          className="mt-5 w-full rounded-full bg-marca px-6 py-2.5 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-50"
        >
          {enviando ? 'Procesando…' : 'Confirmar pedido'}
        </button>
        <p className="mt-3 text-xs text-neutral-500">Se cobra en quetzales. Proyecto académico: no se cobra dinero real.</p>
      </aside>
    </form>
  );
}
