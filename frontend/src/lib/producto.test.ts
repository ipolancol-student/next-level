import { describe, expect, it } from 'vitest';
import { categoriaPrincipal, esVideojuego, limpiarHtml, opcionesDeVariacion, plataformaDe } from './producto';
import type { Atributo, Categoria, VariacionRef } from './tipos';

const cat = (slug: string, name = slug): Categoria => ({ id: slug.length, slug, name });

describe('plataformaDe', () => {
  it('lee la plataforma de la etiqueta del producto', () => {
    expect(plataformaDe({ tags: [{ id: 1, slug: 'switch-2', name: 'Switch 2' }] })).toEqual({ id: 'switch-2', nombre: 'Switch 2' });
  });

  it('ignora etiquetas que no son plataformas', () => {
    expect(plataformaDe({ tags: [{ id: 1, slug: 'oferta', name: 'Oferta' }, { id: 2, slug: 'ps5', name: 'PS5' }] }).id).toBe('ps5');
  });

  it('usa "Multiplataforma" si no hay etiqueta', () => {
    expect(plataformaDe({ tags: [] }).id).toBe('multiplataforma');
  });
});

describe('categoriaPrincipal y esVideojuego', () => {
  const juego = { categories: [cat('videojuegos', 'Videojuegos'), cat('playstation-5', 'PlayStation 5')] };

  it('prefiere la subcategoría sobre la categoría padre', () => {
    expect(categoriaPrincipal(juego)?.name).toBe('PlayStation 5');
  });

  it('distingue videojuegos de accesorios', () => {
    expect(esVideojuego(juego)).toBe(true);
    expect(esVideojuego({ categories: [cat('accesorios'), cat('controles')] })).toBe(false);
  });
});

describe('limpiarHtml', () => {
  it('quita etiquetas y decodifica entidades de WordPress', () => {
    expect(limpiarHtml('<p>Accesorios &amp; más &#8211; edición &#8220;especial&#8221;</p>')).toBe('Accesorios & más – edición “especial”');
  });
});

describe('opcionesDeVariacion', () => {
  const atributos: Atributo[] = [
    {
      id: 3,
      name: 'Edición',
      taxonomy: 'pa_edicion',
      has_variations: true,
      // WooCommerce los devuelve en orden alfabético…
      terms: [
        { id: 48, name: 'Coleccionista', slug: 'coleccionista', default: false },
        { id: 46, name: 'Estándar', slug: 'estandar', default: true },
        { id: 47, name: 'Steelbook', slug: 'steelbook', default: false }
      ]
    }
  ];
  const variaciones: VariacionRef[] = [
    { id: 100, attributes: [{ name: 'Edición', value: 'estandar' }] },
    { id: 101, attributes: [{ name: 'Edición', value: 'steelbook' }] },
    { id: 102, attributes: [{ name: 'Edición', value: 'coleccionista' }] }
  ];

  it('une cada variación con el nombre de su edición, en el orden de las variaciones', () => {
    expect(opcionesDeVariacion({ attributes: atributos, variations: variaciones })).toEqual({
      atributo: 'Edición',
      opciones: [
        { variacionId: 100, valor: 'estandar', nombre: 'Estándar' },
        { variacionId: 101, valor: 'steelbook', nombre: 'Steelbook' },
        { variacionId: 102, valor: 'coleccionista', nombre: 'Coleccionista' }
      ]
    });
  });

  it('devuelve null en productos sin variaciones', () => {
    expect(opcionesDeVariacion({ attributes: [], variations: [] })).toBeNull();
  });

  it('omite variaciones con un término que ya no existe', () => {
    const rotas = [...variaciones, { id: 103, attributes: [{ name: 'Edición', value: 'borrada' }] }];
    expect(opcionesDeVariacion({ attributes: atributos, variations: rotas })?.opciones).toHaveLength(3);
  });
});
