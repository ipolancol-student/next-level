import { beforeEach, describe, expect, it, vi } from 'vitest';

// env() guarda el resultado en memoria: cada prueba carga el módulo de nuevo.
async function cargarEnv() {
  vi.resetModules();
  return (await import('./env')).env;
}

describe('env()', () => {
  beforeEach(() => {
    vi.stubEnv('WP_URL', 'http://localhost:8881/');
    vi.stubEnv('SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
    vi.stubEnv('REVALIDATE_SECRET', '');
    vi.stubEnv('TIPO_CAMBIO_RESPALDO', '');
  });

  it('quita la barra final y aplica valores por defecto', async () => {
    const env = await cargarEnv();
    expect(env()).toEqual({
      WP_URL: 'http://localhost:8881',
      SITE_URL: 'http://localhost:3000',
      REVALIDATE_SECRET: undefined,
      TIPO_CAMBIO_RESPALDO: 7.7
    });
  });

  it('usa el dominio de Vercel si SITE_URL no está definido', async () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'next-level.vercel.app');
    const env = await cargarEnv();
    expect(env().SITE_URL).toBe('https://next-level.vercel.app');
  });

  it('explica qué variable está mal', async () => {
    vi.stubEnv('WP_URL', 'localhost sin protocolo');
    const env = await cargarEnv();
    expect(() => env()).toThrow(/WP_URL/);
  });

  it('exige un secreto de revalidación largo', async () => {
    vi.stubEnv('REVALIDATE_SECRET', 'corto');
    const env = await cargarEnv();
    expect(() => env()).toThrow(/REVALIDATE_SECRET/);
  });
});
