/**
 * Prepara las fotos que el usuario guardó en fotos-productos/originales:
 *   - Reconoce el SKU en el nombre (NL-PS5-001.webp, nl-ps5-001.PNG, "NL-PS5-001 (1).jpg"…).
 *   - "-2", "-3"… después del SKU = fotos de galería.
 *   - Convierte a JPG (máx. 1600 px, fondo blanco si tenía transparencia) con el nombre exacto
 *     y reemplaza la imagen anterior de ese producto (portada diseñada o foto de Commons).
 *   - Actualiza LISTA-PRODUCTOS.csv y los créditos.
 *
 * Uso (desde frontend/):  npm run fotos
 * Variable opcional FOTOS_DIR para usar otra carpeta (pruebas).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const carpeta = path.resolve(process.env.FOTOS_DIR ?? path.join(import.meta.dirname, '../../fotos-productos'));
const originales = path.join(carpeta, 'originales');
const EXTENSIONES = /\.(jpe?g|png|webp|avif|gif|bmp|tiff?)$/i;
const PATRON = /^(NL-[A-Z0-9]+-[A-Z0-9]+?)(?:-(\d+))?(?:\s*\(\d+\))?\.[a-z0-9]+$/i;

if (!fs.existsSync(originales)) {
  console.error(`No existe la carpeta ${originales}. Guarda ahí las fotos con el SKU como nombre.`);
  process.exit(1);
}

// SKUs válidos según la lista de productos.
const csvRuta = path.join(carpeta, 'LISTA-PRODUCTOS.csv');
const csv = fs.readFileSync(csvRuta, 'utf8').replace(/^﻿/, '');
const [cabecera, ...filas] = csv.trim().split(/\r?\n/);
const skus = new Set(filas.map((f) => f.split(';')[0]));

// Agrupar los archivos por SKU.
const porSku = new Map();
const ignorados = [];
for (const archivo of fs.readdirSync(originales)) {
  if (!EXTENSIONES.test(archivo)) continue;
  const m = PATRON.exec(archivo.trim());
  const sku = m?.[1].toUpperCase();
  if (!m || !skus.has(sku)) {
    ignorados.push(archivo);
    continue;
  }
  const numero = Number(m[2] ?? 1);
  if (!porSku.has(sku)) porSku.set(sku, new Map());
  // Si hay dos archivos para el mismo número (p. ej. .jpg y .webp), gana el más reciente.
  const previo = porSku.get(sku).get(numero);
  const fecha = fs.statSync(path.join(originales, archivo)).mtimeMs;
  if (!previo || fecha > previo.fecha) porSku.get(sku).set(numero, { archivo, fecha });
}

// Créditos de Commons: se quitan los de los productos que ahora usan foto del usuario.
const creditosRuta = path.join(carpeta, 'creditos.json');
let creditos = fs.existsSync(creditosRuta) ? JSON.parse(fs.readFileSync(creditosRuta, 'utf8')) : [];

let convertidas = 0;
const errores = [];
for (const [sku, fotos] of porSku) {
  // Borrar la galería anterior de ese producto para no mezclar fotos de distinto origen.
  for (const f of fs.readdirSync(carpeta)) {
    if (new RegExp(`^${sku}-\\d+\\.jpg$`).test(f)) fs.rmSync(path.join(carpeta, f));
  }
  creditos = creditos.filter((c) => c.sku !== sku);

  // Renumerar en orden (1 = principal, luego 2, 3…), aunque falte algún número.
  const ordenadas = [...fotos.entries()].sort((a, b) => a[0] - b[0]);
  for (const [i, [, { archivo }]] of ordenadas.entries()) {
    const destino = path.join(carpeta, i === 0 ? `${sku}.jpg` : `${sku}-${i + 1}.jpg`);
    try {
      await sharp(path.join(originales, archivo), { animated: false })
        .rotate() // respeta la orientación EXIF de fotos de celular
        .flatten({ background: '#ffffff' })
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(destino);
      convertidas++;
    } catch (e) {
      errores.push(`${archivo}: ${e.message}`);
    }
  }
}

// Actualizar la columna "Imagen preparada" y "Fotos de galería" de la lista.
const columnas = cabecera.split(';').map((c) => c.replace(/^"|"$/g, ''));
const iOrigen = columnas.indexOf('Imagen preparada');
const iGaleria = columnas.indexOf('Fotos de galería');
const nuevas = filas.map((f) => {
  const v = f.split(';');
  const sku = v[0];
  if (porSku.has(sku) && iOrigen >= 0) {
    v[iOrigen] = '"Foto guardada por el usuario"';
    const galeria = fs.readdirSync(carpeta).filter((x) => new RegExp(`^${sku}-\\d+\\.jpg$`).test(x)).join(' ');
    if (iGaleria >= 0) v[iGaleria] = `"${galeria || '—'}"`;
  }
  return v.join(';');
});
fs.writeFileSync(csvRuta, '﻿' + [cabecera, ...nuevas].join('\r\n') + '\r\n');

if (fs.existsSync(creditosRuta)) {
  fs.writeFileSync(creditosRuta, JSON.stringify(creditos, null, 2));
  const md = path.join(carpeta, 'CREDITOS.md');
  if (fs.existsSync(md)) {
    const lineas = fs.readFileSync(md, 'utf8').split('\n');
    fs.writeFileSync(md, lineas.filter((l) => !l.startsWith('| NL-') || creditos.some((c) => l.startsWith(`| ${c.archivo} `))).join('\n'));
  }
}

const sinFoto = [...skus].filter((s) => !porSku.has(s));
console.log(`✔ ${convertidas} imágenes convertidas para ${porSku.size} productos`);
console.log(`  Productos que siguen con la imagen anterior: ${sinFoto.length}${sinFoto.length && sinFoto.length <= 20 ? ' → ' + sinFoto.join(', ') : ''}`);
if (ignorados.length) console.log(`  ⚠ Ignorados (el nombre no es un SKU de la lista): ${ignorados.join(', ')}`);
if (errores.length) console.log(`  ✘ No se pudieron convertir: ${errores.join(' | ')}`);
