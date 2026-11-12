/**
 * Genera fotos-productos/BUSCAR-FOTOS.html: una página para buscar la foto de cada
 * producto (Amazon o Google Imágenes) y copiar el nombre exacto con el que hay que guardarla.
 *
 * Uso (desde frontend/):  npm run fotos:pagina
 */
import fs from 'node:fs';
import path from 'node:path';

const carpeta = path.resolve(import.meta.dirname, '../../fotos-productos');
const csv = fs.readFileSync(path.join(carpeta, 'LISTA-PRODUCTOS.csv'), 'utf8').replace(/^﻿/, '');
const [cabecera, ...filas] = csv.trim().split(/\r?\n/);
const columnas = cabecera.split(';').map((c) => c.replace(/^"|"$/g, ''));
const productos = filas.map((f) => {
  const valores = f.split(';').map((c) => c.replace(/^"|"$/g, ''));
  return Object.fromEntries(columnas.map((c, i) => [c, valores[i]]));
});

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Término de búsqueda: el nombre sin el sufijo " – Plataforma" duplica menos, pero la plataforma ayuda a acertar.
const busqueda = (p) => p.Producto.replace(/ – /g, ' ');

const secciones = [...new Set(productos.map((p) => p['Sección']))];

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Buscar fotos de productos · Next Level</title>
<style>
  :root { color-scheme: dark; --fondo:#0b0b14; --sup:#15141f; --borde:#ffffff1a; --texto:#f2f1f7; --tenue:#a9a6bb; --marca:#8b5cf6; --neon:#34e3b0; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--fondo); color:var(--texto); font:15px/1.5 "Segoe UI", system-ui, sans-serif; }
  header { position:sticky; top:0; z-index:1; background:#0b0b14ee; backdrop-filter:blur(8px); border-bottom:1px solid var(--borde); padding:16px 24px; }
  h1 { margin:0; font:700 22px "Bahnschrift","Segoe UI",sans-serif; letter-spacing:.5px; }
  h1 span { color:var(--neon); }
  .pasos { margin:6px 0 12px; color:var(--tenue); font-size:13px; }
  .pasos b { color:var(--texto); }
  input[type=search] { width:100%; max-width:420px; padding:9px 14px; border-radius:10px; border:1px solid var(--borde); background:var(--sup); color:var(--texto); }
  main { padding:16px 24px 48px; max-width:1200px; margin:auto; }
  h2 { font:700 16px "Bahnschrift","Segoe UI",sans-serif; text-transform:uppercase; letter-spacing:2px; color:var(--neon); margin:28px 0 10px; }
  table { width:100%; border-collapse:collapse; background:var(--sup); border:1px solid var(--borde); border-radius:14px; overflow:hidden; }
  th, td { padding:10px 12px; border-bottom:1px solid var(--borde); text-align:left; vertical-align:middle; }
  th { font-size:12px; text-transform:uppercase; letter-spacing:1px; color:var(--tenue); }
  tr:last-child td { border-bottom:0; }
  tr.lista td { opacity:.45; }
  .sku { font-family:Consolas, monospace; color:var(--tenue); white-space:nowrap; }
  .chip { display:inline-block; font-size:11px; padding:2px 8px; border-radius:6px; background:#ffffff14; color:var(--tenue); white-space:nowrap; }
  .chip.real { background:#34e3b022; color:var(--neon); }
  a.btn, button { display:inline-block; font:600 12px "Segoe UI",sans-serif; text-transform:uppercase; letter-spacing:.5px; padding:7px 12px; border-radius:8px; border:1px solid var(--borde); color:var(--texto); background:transparent; text-decoration:none; cursor:pointer; white-space:nowrap; }
  a.btn.amazon { background:var(--marca); border-color:var(--marca); }
  a.btn:hover, button:hover { filter:brightness(1.2); }
  button.copiado { border-color:var(--neon); color:var(--neon); }
  label.hecho { display:flex; gap:6px; align-items:center; color:var(--tenue); font-size:12px; cursor:pointer; }
  .progreso { color:var(--tenue); font-size:13px; margin-left:12px; }
</style>
</head>
<body>
<header>
  <h1>NEXT<span>LEVEL</span> · Buscar fotos de productos</h1>
  <p class="pasos">
    <b>1.</b> Clic en <b>Amazon</b> (o Google) → abre el producto → clic derecho sobre la foto grande → <b>Guardar imagen como…</b>
    &nbsp;<b>2.</b> Clic en <b>Copiar nombre</b> y pégalo como nombre del archivo.
    &nbsp;<b>3.</b> Guárdala en <b>fotos-productos\\originales</b>.
    &nbsp;<b>4.</b> Al terminar ejecuta <b>npm run fotos</b> (o pídeselo a Claude).
  </p>
  <input type="search" id="filtro" placeholder="Filtrar por nombre o SKU…" aria-label="Filtrar productos">
  <span class="progreso" id="progreso"></span>
</header>
<main>
${secciones.map((s) => `
  <h2>${esc(s)}</h2>
  <table>
    <thead><tr><th>Listo</th><th>SKU</th><th>Producto</th><th>Imagen actual</th><th>Guardar como</th><th>Buscar</th></tr></thead>
    <tbody>
    ${productos.filter((p) => p['Sección'] === s).map((p) => `
      <tr data-buscar="${esc((p.SKU + ' ' + p.Producto).toLowerCase())}" data-sku="${esc(p.SKU)}">
        <td><label class="hecho"><input type="checkbox"> </label></td>
        <td class="sku">${esc(p.SKU)}</td>
        <td>${esc(p.Producto)}</td>
        <td><span class="chip ${p['Imagen preparada']?.startsWith('Foto real') ? 'real' : ''}">${p['Imagen preparada']?.startsWith('Foto real') ? 'Foto real' : 'Portada diseñada'}</span></td>
        <td><button type="button" data-copiar="${esc(p.SKU)}">Copiar nombre</button></td>
        <td>
          <a class="btn amazon" target="_blank" rel="noopener noreferrer" href="https://www.amazon.com/s?k=${encodeURIComponent(busqueda(p))}">Amazon</a>
          <a class="btn" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(busqueda(p))}">Google</a>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`).join('')}
</main>
<script>
  // "Copiar nombre": copia el SKU (el script acepta .jpg, .png, .webp y -2, -3… para la galería).
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copiar]');
    if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copiar); } catch { prompt('Copia el nombre:', b.dataset.copiar); }
    b.textContent = '✓ ' + b.dataset.copiar; b.classList.add('copiado');
  });
  // Marcar como listo (se recuerda en este navegador).
  const clave = 'nextlevel-fotos-listas';
  const listas = new Set(JSON.parse(localStorage.getItem(clave) || '[]'));
  const filas = [...document.querySelectorAll('tr[data-sku]')];
  const progreso = () => { document.getElementById('progreso').textContent = listas.size + ' de ' + filas.length + ' listas'; };
  for (const fila of filas) {
    const caja = fila.querySelector('input[type=checkbox]');
    caja.checked = listas.has(fila.dataset.sku); fila.classList.toggle('lista', caja.checked);
    caja.addEventListener('change', () => {
      caja.checked ? listas.add(fila.dataset.sku) : listas.delete(fila.dataset.sku);
      fila.classList.toggle('lista', caja.checked);
      localStorage.setItem(clave, JSON.stringify([...listas])); progreso();
    });
  }
  progreso();
  // Filtro
  document.getElementById('filtro').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    for (const f of filas) f.hidden = q && !f.dataset.buscar.includes(q);
  });
</script>
</body>
</html>
`;

fs.mkdirSync(path.join(carpeta, 'originales'), { recursive: true });
fs.writeFileSync(path.join(carpeta, 'BUSCAR-FOTOS.html'), html);
console.log(`✔ BUSCAR-FOTOS.html con ${productos.length} productos · carpeta "originales" lista`);
