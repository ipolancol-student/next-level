import { describe, expect, it } from 'vitest';
import { aDolares, formatearPrecio, formatearQuetzales } from './dinero';
import type { Moneda } from './tipos';

const GTQ: Moneda = {
  currency_code: 'GTQ',
  currency_symbol: 'Q',
  currency_minor_unit: 2,
  currency_decimal_separator: '.',
  currency_thousand_separator: ',',
  currency_prefix: 'Q',
  currency_suffix: ''
};

describe('formatearPrecio', () => {
  it('convierte centavos a quetzales con dos decimales', () => {
    expect(formatearPrecio('49900', GTQ)).toBe('Q499.00');
  });

  it('agrega separador de miles', () => {
    expect(formatearPrecio('249900', GTQ)).toBe('Q2,499.00');
    expect(formatearPrecio('123456789', GTQ)).toBe('Q1,234,567.89');
  });

  it('respeta los separadores y sufijos configurados en WooCommerce', () => {
    const eur: Moneda = { ...GTQ, currency_prefix: '', currency_suffix: ' €', currency_decimal_separator: ',', currency_thousand_separator: '.' };
    expect(formatearPrecio('1234550', eur)).toBe('12.345,50 €');
  });

  it('trata un monto vacío como cero', () => {
    expect(formatearPrecio(null, GTQ)).toBe('Q0.00');
  });
});

describe('aDolares', () => {
  it('convierte con el tipo de cambio del Banguat y redondea a centavos', () => {
    // 549 / 7.63807 = 71.876…
    expect(aDolares('54900', 2, 7.63807)).toBe('US$71.88');
  });

  it('agrega separador de miles en dólares', () => {
    expect(aDolares('1000000', 2, 7.7)).toBe('US$1,298.70');
  });

  it('rechaza un tipo de cambio inválido en vez de mostrar Infinity', () => {
    expect(() => aDolares('100', 2, 0)).toThrow(RangeError);
  });
});

describe('formatearQuetzales', () => {
  it('formatea los totales de pedido de WooCommerce ("499.00")', () => {
    expect(formatearQuetzales('1199.00')).toBe('Q1,199.00');
  });
});
