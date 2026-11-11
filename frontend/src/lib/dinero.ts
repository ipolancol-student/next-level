/**
 * Formato de montos. La Store API manda los precios como texto en la unidad
 * mínima de la moneda: "49900" con currency_minor_unit = 2 significa Q499.00.
 * Nunca se usan decimales de punto flotante para guardar montos.
 */
import type { Moneda } from './tipos';

/** "49900" → "Q499.00" con los separadores configurados en WooCommerce. */
export function formatearPrecio(monto: string | null | undefined, moneda: Moneda) {
  const valor = Number(monto ?? 0) / 10 ** moneda.currency_minor_unit;
  const [entero, decimales] = valor.toFixed(moneda.currency_minor_unit).split('.');
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, moneda.currency_thousand_separator);
  const numero = decimales ? `${conMiles}${moneda.currency_decimal_separator}${decimales}` : conMiles;
  return `${moneda.currency_prefix}${numero}${moneda.currency_suffix}`;
}

const formatoUsd = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "49900" (centavos de quetzal) → "US$65.33" con el tipo de cambio dado. */
export function aDolares(montoMinimo: string | null | undefined, unidadMinima: number, quetzalesPorDolar: number) {
  if (!(quetzalesPorDolar > 0)) throw new RangeError('El tipo de cambio debe ser mayor que cero');
  const quetzales = Number(montoMinimo ?? 0) / 10 ** unidadMinima;
  return `US$${formatoUsd.format(quetzales / quetzalesPorDolar)}`;
}

/** "499.00" (formato de pedidos de WooCommerce) → "Q499.00". */
export function formatearQuetzales(total: string | number) {
  return `Q${formatoUsd.format(Number(total))}`;
}
