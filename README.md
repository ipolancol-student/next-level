# Next Level — e-commerce headless de videojuegos

[![CI](https://github.com/ipolancol-student/next-level/actions/workflows/ci.yml/badge.svg)](https://github.com/ipolancol-student/next-level/actions/workflows/ci.yml)

Proyecto de Seminario de Final de Curso. **Next Level** es una tienda en línea de **videojuegos
físicos y accesorios para consola** (PlayStation, Xbox y Nintendo) en Guatemala, construida con
arquitectura **headless**:

- **Backend:** WordPress + WooCommerce (catálogo, inventario, pedidos, panel de administración).
- **Frontend:** Next.js 16 (React 19, TypeScript, Tailwind CSS), desplegable en Vercel.
- **Pagos con tarjeta:** Recurrente, pasarela guatemalteca (modo de prueba gratuito).
- **Moneda:** se cobra en quetzales (GTQ); cada precio muestra su equivalente en dólares con el
  **tipo de cambio de referencia del Banco de Guatemala**.

**Costo de desarrollo: 0 USD** → [docs/costos-y-justificacion.md](docs/costos-y-justificacion.md)

## Funcionalidades

| Área | Detalle |
|---|---|
| Catálogo | 42 productos, categorías en dos niveles (consola / tipo de accesorio), búsqueda, orden por novedad, precio o ventas, paginación |
| Variaciones | Ediciones (Estándar, Steelbook, Coleccionista) y colores, cada una con su precio y stock |
| Fotos | Galería por producto optimizada con `next/image` (AVIF/WebP); si no hay foto, portada generada por plataforma |
| Carrito | Basado en el `Cart-Token` de WooCommerce, en cookie `httpOnly` |
| Checkout | Validación en servidor con Zod, departamentos de Guatemala, envío gratis desde Q500 |
| Pagos | Tarjeta (Recurrente), contra entrega y transferencia |
| Pedidos | Página de estado `/pedido/{id}?key=…` con confirmación del pago en tiempo real |
| Monedas | Quetzales + equivalente en US$ (servicio web del Banguat, caché de 1 h, valor de respaldo) |
| SEO | `sitemap.xml`, `robots.txt`, Open Graph, URL canónica, datos estructurados `schema.org/Product` |
| Seguridad | CSP, HSTS, X-Frame-Options, firmas HMAC/Svix, claves solo en servidor, variables validadas |
| Calidad | 43 pruebas unitarias (Vitest), pruebas PHP, lint, TypeScript estricto, CI en GitHub Actions |

## Arquitectura

```
                    ┌──────────────── Vercel ────────────────┐
  Navegador ───────►│ Next.js 16 (App Router)                │
                    │  • Server Components + streaming       │
                    │  • Server Actions (carrito, checkout)  │──── tipo de cambio ───► Banco de Guatemala (SOAP)
                    │  • Caché 'use cache' (tag "catalogo")  │
                    │  • /api/revalidar  ◄──── aviso HMAC ───┼──────────┐
                    └──────────────┬─────────────────────────┘          │
                                   │ Store API / REST (solo servidor)    │
                    ┌──────────────▼─────────────────────────┐          │
                    │ WordPress + WooCommerce                 │──────────┘
                    │  • tienda-headless.php (mu-plugin)      │
                    │  • nextlevel-recurrente.php (pasarela)  │◄──── webhook Svix ──┐
                    └──────────────┬─────────────────────────┘                     │
                                   │ crea checkout / consulta pago                  │
                                   └────────────────────────────────────────► Recurrente
```

**Decisiones de diseño:**

- **Todo pasa por el servidor.** El navegador nunca habla con WordPress ni con Recurrente
  directamente: no hay CORS, la URL de WordPress no se expone y la clave de Recurrente vive solo en
  WordPress.
- **Caché con invalidación por eventos.** El catálogo se sirve desde caché; WordPress avisa a
  `/api/revalidar` (firma HMAC-SHA256 + timestamp) cuando cambia un producto, su stock o una
  categoría, y el cambio se ve en la siguiente visita. Cada compra también invalida la caché.
- **Un pago nunca se confirma por la redirección.** El pedido se marca pagado solo cuando la API de
  Recurrente confirma que el checkout está `paid` **y** que monto y moneda coinciden con el pedido.
  Esto ocurre por dos caminos: el webhook firmado (Svix) y la consulta al volver a la tienda.
- **Idempotencia.** Reintentos del cliente o webhooks duplicados no crean checkouts ni confirmaciones
  repetidas (`Idempotency-Key`, verificación de `needs_payment()`).
- **Montos en enteros.** Los precios viajan en centavos (`49900` = Q499.00); nunca se usan decimales
  de punto flotante para guardar dinero.
- **Lógica pura separada de la red** (`lib/dinero`, `lib/producto`, `lib/firma`, `lib/validacion`,
  `lib/banguat`): se prueba sin WordPress.

## Estructura

```
├── .github/workflows/ci.yml       ← CI: lint, tipos, pruebas, build y sintaxis PHP
├── docs/
│   ├── costos-y-justificacion.md  ← herramientas, costos y por qué (para el informe)
│   └── despliegue.md              ← GitHub, Vercel, Cloudflare Tunnel y Recurrente paso a paso
├── wordpress/
│   ├── GUIA-WORDPRESS.md          ← instalación del backend
│   ├── tienda-headless.php        ← mu-plugin: redirecciones, caché, API de pedidos, seguridad
│   ├── nextlevel-recurrente.php   ← mu-plugin: pasarela de pago Recurrente + webhook
│   ├── catalogo-gamer.php         ← configura GTQ, envíos y carga el catálogo de prueba
│   └── pruebas/                   ← pruebas PHP (firma Svix, montos, orígenes)
└── frontend/                      ← Next.js 16
    └── src/
        ├── app/                   ← rutas: /, /tienda, /producto/[slug], /carrito, /checkout,
        │                            /pedido/[id], /[slug], /api/revalidar, sitemap, robots
        ├── components/            ← Precio, Portada, GaleriaProducto, FormularioCompra, …
        └── lib/
            ├── woo.ts             ← cliente de la Store API (caché del catálogo)
            ├── acciones.ts        ← Server Actions
            ├── env.ts             ← variables de entorno validadas con Zod
            ├── dinero.ts · producto.ts · firma.ts · validacion.ts · banguat.ts (+ *.test.ts)
            └── tipoCambio.ts      ← Banguat con caché
```

## Puesta en marcha local

**Requisitos (gratis):** [Node.js 22](https://nodejs.org), [WordPress Studio](https://developer.wordpress.com/studio/), [Git](https://git-scm.com/).

1. **Backend:** sigue [wordpress/GUIA-WORDPRESS.md](wordpress/GUIA-WORDPRESS.md).
2. **Frontend:**

```bash
cd frontend
npm install
cp .env.example .env.local   # edita WP_URL, SITE_URL y REVALIDATE_SECRET
npm run dev                  # http://localhost:3000
```

| Comando (en `frontend/`) | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run verificar` | Lint + tipos + pruebas (lo mismo que la CI) |
| `npm run build` | Build de producción |

**Tarjetas de prueba de Recurrente:** `4242 4242 4242 4242` (aprobada) y `4000 0000 0000 0002`
(rechazada), con cualquier fecha futura y CVC de 3 dígitos.

## Despliegue

Ver [docs/despliegue.md](docs/despliegue.md): repositorio en GitHub, frontend en Vercel (plan
Hobby), WordPress publicado con Cloudflare Tunnel y configuración de Recurrente.

## Limitaciones conocidas

- Sin cuentas de cliente: se compra como invitado (el pedido se consulta con su enlace privado).
- Los productos variables admiten un solo atributo de variación (edición **o** color).
- Cloudflare Tunnel gratuito cambia de URL en cada arranque; para producción real hace falta un
  hosting fijo para WordPress (ver la justificación de costos).
