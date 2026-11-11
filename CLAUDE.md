# Next Level — instrucciones para Claude Code

Proyecto de Seminario de Final de Curso: tienda en línea de **videojuegos físicos y accesorios
para consola en Guatemala**. Backend con WordPress + WooCommerce (headless) y frontend con Next.js 16.
Para el detalle completo, lee [README.md](README.md).

## Reglas

- **Responde siempre en español**: explicaciones, resúmenes, preguntas y mensajes de commit.
- **Costo 0 USD**: no propongas servicios ni plugins de pago sin justificar por qué hacen falta
  (ver [docs/costos-y-justificacion.md](docs/costos-y-justificacion.md)).
- **Moneda**: se cobra en quetzales (GTQ). Los dólares solo se muestran como equivalente, con el
  tipo de cambio del Banguat (`frontend/src/lib/tipoCambio.ts`).
- **Nada de carátulas con derechos de autor**: si un producto no tiene foto, el frontend dibuja una
  portada por plataforma (`components/Portada.tsx`).
- **Commit al terminar cada mejora**, en la rama `main`, solo cuando el usuario lo pida.

## Estructura

| Ruta | Qué es |
|---|---|
| `frontend/` | Next.js 16 (App Router, React 19, Tailwind 4). Lee también [frontend/AGENTS.md](frontend/AGENTS.md) |
| `frontend/src/lib/woo.ts` | Cliente de la WooCommerce Store API (`/wp-json/wc/store/v1`) |
| `frontend/src/lib/acciones.ts` | Server Actions: carrito y checkout |
| `wordpress/tienda-headless.php` | mu-plugin: redirecciones, avisos de caché, API de pedidos, seguridad |
| `wordpress/nextlevel-recurrente.php` | mu-plugin: pasarela de pago Recurrente + webhook Svix |
| `docs/despliegue.md` | GitHub, Vercel, Cloudflare Tunnel y Recurrente |
| `wordpress/catalogo-gamer.php` | Configura GTQ y envíos, y carga el catálogo de prueba |
| `docs/` | Textos para el informe del Seminario |

## Entorno local

- **WordPress**: WordPress Studio, sitio "Next Level" en http://localhost:8881, carpeta
  `C:\Users\isaio\Studio\next-level`. Panel: `/wp-admin`.
- **Frontend**: `cd frontend && npm run dev` → http://localhost:3000. Variables en
  `frontend/.env.local` (`WP_URL`, opcional `TIPO_CAMBIO_RESPALDO`).
- **WP-CLI**: usa siempre `studio wp ...` desde la carpeta del sitio. En PowerShell las comillas
  dobles se pierden: para PHP escribe un archivo temporal en la carpeta del sitio y ejecuta
  `studio wp eval-file archivo.php` (el PHP de Studio solo ve la carpeta del sitio). Borra el
  archivo al terminar.
- **Plugins**: edita los archivos de `wordpress/` en el proyecto y luego cópialos a
  `C:\Users\isaio\Studio\next-level\wp-content\mu-plugins\`. Nunca edites solo la copia.
- No edites el núcleo de WordPress (`wp-admin`, `wp-includes`, `wp-*.php`).

## Comprobaciones

```bash
cd frontend && npm run verificar   # lint + tipos + 43 pruebas (igual que la CI)
```

Pruebas PHP: copia `wordpress/pruebas/prueba-recurrente.php` al sitio y `studio wp eval-file prueba-recurrente.php`.

`next build` y `next dev` pueden convivir (Next 16 usa `.next/dev`). Prueba los cambios en el
navegador: catálogo → producto → carrito → checkout, y verifica el pedido con
`studio wp wc shop_order list --user=1`.

## Trampas conocidas (ya resueltas; no las reintroduzcas)

- **Next.js 16 con `cacheComponents`**: los datos dinámicos (cookies, `params`, `searchParams`,
  `fetch` sin caché) van dentro de `<Suspense>`. Las cookies solo se escriben en Server Actions.
  El caché se hace con `'use cache'` + `cacheLife()`, no con `revalidate`. Antes de usar una API de
  Next, consulta `frontend/node_modules/next/dist/docs/`.
- **Nonce de WooCommerce**: un POST a la Store API sin `Cart-Token` falla ("No está disponible la
  cabecera Nonce"). `storeFetch` pide primero un carrito con GET para obtener el token.
- **React 19 vacía los formularios** después de cada acción: el checkout devuelve `valores` en el
  estado para volver a llenarlos si hay error.
- **Precios de la Store API** vienen en centavos ("49900" = Q499.00). Usa `formatearPrecio` y
  `aDolares`.
- **Envío gratis**: el plugin oculta los envíos de pago cuando aplica el gratis (desde Q500). Sin eso
  WooCommerce elige el de Q35.
- **Departamentos y estados**: WooCommerce exige códigos (`GT-GU`, `CA`), no nombres.
- **Panel del navegador oculto**: el contenido en streaming no aparece porque no hay animation
  frames. Para probar, ejecuta `window.$RV(window.$RB)` en la página. No es un error de la tienda.
- **WordPress Studio es lento** (1–3 s por petición). No es un problema de rendimiento del frontend.
- **Pagos**: un pedido con tarjeta se marca pagado SOLO tras confirmar con la API de Recurrente
  (estado `paid`, monto y moneda). Nunca confiar en la redirección de `success_url`.
- **Caché**: el catálogo usa `catalogoFetch` (`use cache` + tag `catalogo`); el carrito y los pedidos
  nunca se cachean. Las páginas que no leen la petición llaman `await connection()` para que el build
  no dependa de WordPress.
- **Shell**: no metas backticks de Markdown dentro de `node -e "..."` en bash: se ejecutan como comandos.
