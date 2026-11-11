import { describe, expect, it } from 'vitest';
import { erroresPorCampo, esquemaCheckout } from './validacion';

const valido = {
  first_name: 'Ana',
  last_name: 'López',
  email: '  Ana.Lopez@Example.com ',
  phone: '5555 1234',
  address_1: '6a Avenida 10-20, Zona 1',
  city: 'Guatemala',
  state: 'GT-GU',
  postcode: '',
  country: 'GT',
  payment_method: 'recurrente',
  nota: ''
};

function errores(datos: Record<string, string>) {
  const r = esquemaCheckout.safeParse(datos);
  return r.success ? {} : erroresPorCampo(r.error);
}

describe('validación del checkout', () => {
  it('acepta un pedido válido de Guatemala y normaliza el correo', () => {
    const r = esquemaCheckout.parse(valido);
    expect(r.email).toBe('ana.lopez@example.com');
  });

  it('exige un correo válido', () => {
    expect(errores({ ...valido, email: 'ana@' })).toHaveProperty('email');
  });

  it('exige teléfono de al menos 8 dígitos', () => {
    expect(errores({ ...valido, phone: '1234' })).toHaveProperty('phone');
  });

  it('exige departamento en Guatemala', () => {
    expect(errores({ ...valido, state: '' })).toEqual({ state: 'Elige una opción' });
  });

  it('exige ZIP code de 5 dígitos en EE. UU.', () => {
    const us = { ...valido, country: 'US', state: 'CA' };
    expect(errores({ ...us, postcode: '9000' })).toHaveProperty('postcode');
    expect(errores({ ...us, postcode: '90001' })).toEqual({});
  });

  it('exige elegir un método de pago', () => {
    expect(errores({ ...valido, payment_method: '' })).toHaveProperty('payment_method');
  });

  it('limita el largo de la nota', () => {
    expect(errores({ ...valido, nota: 'x'.repeat(501) })).toHaveProperty('nota');
  });
});
