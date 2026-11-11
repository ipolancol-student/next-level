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

// Clases de los campos (utilidad `campo` definida en globals.css).
const campo = 'campo';
const etiqueta = 'block text-sm font-medium text-tenue';
const seccion = 'panel p-6';
const leyenda = 'flex items-center gap-3 font-display text-lg font-bold uppercase tracking-wide';

export function FormularioCheckout({ paisPorDefecto, metodos, lineas, envio, total, totalUsd }: Props) {
  // noValidate: la validación la hace el servidor con Zod (mensajes iguales en todos los navegadores).
  // React 19 vacía el formulario después de cada envío. Si WooCommerce rechaza el
  // pedido, la acción devuelve lo que escribió el cliente y lo usamos como valor inicial.
  const [estado, accion, enviando] = useActionState(checkoutAction, {});
  const v = estado.valores ?? {};
  // El país es "controlado" porque el campo de departamento/estado cambia según el país.
  const [pais, setPais] = useState(paisPorDefecto);
  const region = REGIONES[pais];
  const e = estado.errores ?? {};
  const [metodo, setMetodo] = useState(v.payment_method ?? metodos[0]?.id);
  // Marca el campo con error para lectores de pantalla y muestra el mensaje debajo.
  const err = (campo: string) => ({ 'aria-invalid': Boolean(e[campo]) || undefined, 'aria-describedby': e[campo] ? `error-${campo}` : undefined });
  const msg = (campo: string) => e[campo] ? <span id={`error-${campo}`} className="mt-1 block text-xs text-alerta">{e[campo]}</span> : null;

  return (
    <form action={accion} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        {estado.error && (
          <p className="rounded-xl border border-alerta/40 bg-alerta/10 px-4 py-3 text-sm text-alerta" role="alert">{estado.error}</p>
        )}

        <fieldset className={seccion}>
          <legend className={leyenda}>
            <span className="grid size-7 place-items-center rounded-lg bg-marca font-display text-sm text-white">1</span>
            Tus datos
          </legend>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className={`${etiqueta}`}>Nombre<input name="first_name" defaultValue={v.first_name} required autoComplete="given-name" className={campo}  {...err('first_name')} />{msg('first_name')}</label>
            <label className={`${etiqueta}`}>Apellido<input name="last_name" defaultValue={v.last_name} required autoComplete="family-name" className={campo}  {...err('last_name')} />{msg('last_name')}</label>
            <label className={`${etiqueta}`}>Correo<input name="email" defaultValue={v.email} type="email" required autoComplete="email" className={campo}  {...err('email')} />{msg('email')}</label>
            <label className={`${etiqueta}`}>Teléfono<input name="phone" defaultValue={v.phone} type="tel" required autoComplete="tel" className={campo}  {...err('phone')} />{msg('phone')}</label>
          </div>
        </fieldset>

        <fieldset className={seccion}>
          <legend className={leyenda}>
            <span className="grid size-7 place-items-center rounded-lg bg-marca font-display text-sm text-white">2</span>
            Dirección de envío
          </legend>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className={`${etiqueta} sm:col-span-2`}>Dirección<input name="address_1" defaultValue={v.address_1} required autoComplete="address-line1" placeholder="Calle, número, zona" className={campo}  {...err('address_1')} />{msg('address_1')}</label>
            <label className={`${etiqueta}`}>
              País
              <select name="country" value={pais} onChange={(e) => setPais(e.target.value)} className={campo}>
                {PAISES.map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}
              </select>
            </label>
            <label className={`${etiqueta}`}>
              {region?.etiqueta ?? 'Provincia / Estado'}
              {region ? (
                <select name="state" key={`region-${pais}`} defaultValue={v.state ?? ''} required autoComplete="address-level1" className={campo} {...err('state')}>
                  <option value="" disabled>Elige una opción</option>
                  {region.opciones.map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}
                </select>
              ) : (
                <input name="state" key="region-texto" defaultValue={v.state} autoComplete="address-level1" className={campo} {...err('state')} />
              )}
              {msg('state')}
            </label>
            <label className={`${etiqueta}`}>Ciudad / Municipio<input name="city" defaultValue={v.city} required autoComplete="address-level2" className={campo}  {...err('city')} />{msg('city')}</label>
            <label className={`${etiqueta}`}>
              Código postal {pais === 'US' ? '' : '(opcional)'}
              <input name="postcode" defaultValue={v.postcode} required={pais === 'US'} autoComplete="postal-code" className={campo} {...err('postcode')} />
              {msg('postcode')}
            </label>
            <label className={`${etiqueta} sm:col-span-2`}>
              Notas del pedido (opcional)
              <textarea name="nota" defaultValue={v.nota} rows={2} placeholder="Ej.: entregar en horario de oficina" className={campo} {...err('nota')} />
              {msg('nota')}
            </label>
          </div>
        </fieldset>

        <fieldset className={seccion}>
          <legend className={leyenda}>
            <span className="grid size-7 place-items-center rounded-lg bg-marca font-display text-sm text-white">3</span>
            Método de pago
          </legend>
          {metodos.length === 0 ? (
            <p className="mt-4 text-sm text-alerta">
              No hay métodos de pago activos. Actívalos en WordPress: WooCommerce → Ajustes → Pagos (por ejemplo
              &quot;Contra reembolso&quot; o &quot;Transferencia bancaria&quot;).
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {metodos.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-borde bg-fondo px-4 py-3.5 transition hover:border-borde-fuerte has-checked:border-marca has-checked:bg-marca-claro"
                >
                  <input type="radio" name="payment_method" value={m.id} checked={metodo === m.id} onChange={() => setMetodo(m.id)} required className="size-4 accent-marca" />
                  <span className="flex-1 font-medium">{m.nombre}</span>
                  {m.id === 'recurrente' && (
                    <span className="flex gap-1" aria-hidden="true">
                      {['VISA', 'MC'].map((t) => <span key={t} className="rounded border border-borde-fuerte px-1.5 py-0.5 font-display text-[0.65rem] font-bold">{t}</span>)}
                    </span>
                  )}
                </label>
              ))}
              {metodo === 'recurrente' && (
                <p className="flex gap-2 rounded-xl border border-marca/30 bg-marca-claro px-4 py-3 text-sm text-tenue">
                  <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-neon" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                  <span>
                  Al confirmar, irás a la página segura de <strong>Recurrente</strong> para pagar con tu tarjeta.
                  Next Level nunca ve ni guarda los datos de tu tarjeta.</span>
                </p>
              )}
              {msg('payment_method')}
            </div>
          )}
        </fieldset>
      </div>

      <aside className="panel h-fit p-6 lg:sticky lg:top-32">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide">Tu pedido</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {lineas.map((l) => (
            <li key={l.key} className="flex justify-between gap-4">
              <span className="text-tenue">{l.nombre} <span className="text-apagado">× {l.cantidad}</span></span>
              <span className="whitespace-nowrap">{l.total}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-borde pt-4 text-sm">
          {envio !== null && (
            <div className="flex justify-between"><dt className="text-tenue">Envío a Guatemala</dt><dd>{envio === 'Q0.00' ? <span className="font-semibold text-neon">Gratis</span> : envio}</dd></div>
          )}
          <div className="flex items-start justify-between border-t border-borde pt-3">
            <dt className="font-display text-base font-bold uppercase">Total</dt>
            <dd className="text-right">
              <span className="font-display text-2xl font-bold">{total}</span>
              <span className="block text-xs text-apagado">≈ {totalUsd}</span>
            </dd>
          </div>
        </dl>
        {pais !== 'GT' && (
          <p className="mt-4 rounded-xl border border-borde bg-fondo px-3 py-2 text-xs text-tenue">
            Envío internacional: Q350. Se suma al confirmar el pedido.
          </p>
        )}
        <button
          disabled={enviando || metodos.length === 0}
          className="boton-primario mt-6 w-full"
        >
          {enviando ? 'Procesando…' : metodo === 'recurrente' ? 'Pagar con tarjeta' : 'Confirmar pedido'}
        </button>
        <p className="mt-4 text-center text-xs text-apagado">Se cobra en quetzales · Proyecto académico: no se cobra dinero real.</p>
      </aside>
    </form>
  );
}
