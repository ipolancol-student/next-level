# Arquitectura, almacenamiento de datos y rendimiento

> Sección pensada para el informe del Seminario.

## 1. ¿Cumple con la arquitectura WordPress Headless de referencia?

El diagrama de referencia (curso *WordPress Headless 2025* de midudev) tiene cinco elementos. El
proyecto los cumple todos:

| Elemento del diagrama | En Next Level | ¿Cumple? |
|---|---|---|
| **Dev → Programación → FrontEnd personalizado** (Astro, Nuxt, **Next.js**, .NET, app nativa) | Frontend propio en **Next.js 16** (`frontend/`), programado en TypeScript. Se empezó en Astro y se migró a Next.js sin tocar WordPress, lo que demuestra el desacoplamiento. | ✅ |
| **Administrador de contenido → Contenido → WordPress /wp-admin** | El administrador gestiona productos, precios, stock, fotos, categorías, páginas y pedidos en `/wp-admin` (WooCommerce). | ✅ |
| **Base de datos: MySQL / MariaDB / SQLite** | **SQLite** (WordPress Studio), archivo `wp-content/database/.ht.sqlite`. En un hosting se usaría MySQL/MariaDB sin cambiar código. | ✅ |
| **Plugins** | WooCommerce (tienda) + plugins propios: `tienda-headless.php` y `nextlevel-recurrente.php`. | ✅ |
| **PHP** | WordPress 7.1 + WooCommerce 11.2 sobre PHP 8 (en WebAssembly dentro de Studio). | ✅ |
| **API · JSON** entre WordPress y el frontend | **WooCommerce Store API** (`/wp-json/wc/store/v1`), **WordPress REST API** (`/wp-json/wp/v2`) y una API propia (`/wp-json/nextlevel/v1`), todas en **JSON**. | ✅ |

### Lo que el proyecto agrega a la arquitectura de referencia

```
 Cliente ──► Next.js (Vercel) ──JSON──► WordPress + WooCommerce ──► SQLite
                │  ▲                          │
                │  └──── aviso firmado (HMAC) ┘  "cambió el catálogo" → refrescar caché
                ├────► Banco de Guatemala (SOAP) tipo de cambio Q/US$
                └────► Recurrente (pago con tarjeta) ──► confirma el pago a WordPress
```

- **Comunicación en los dos sentidos:** además de que el frontend lee la API, WordPress **avisa** al
  frontend cuando algo cambia (`POST /api/revalidar`, firmado con HMAC-SHA256).
- **Servicios externos:** tipo de cambio oficial del Banguat y pasarela de pago Recurrente.
- **Todo pasa por el servidor de Next.js:** el navegador nunca llama a WordPress directamente.

## 2. ¿Dónde se almacena la información de la tienda?

### En WordPress (la "fuente de verdad")

Toda la información del negocio vive en **una base de datos SQLite**: un solo archivo de ~5 MB.

```
C:\Users\isaio\Studio\next-level\wp-content\database\.ht.sqlite
```

| Información | Tabla | Cantidad actual |
|---|---|---|
| Productos | `wp_posts` (tipo `product`) | 84 |
| Variaciones (edición, color, modelo, monto) | `wp_posts` (tipo `product_variation`) | 34 |
| Precios, stock, SKU, ofertas | `wp_postmeta` | ~3,200 registros |
| Índice rápido de precios y stock | `wp_wc_product_meta_lookup` | 118 |
| Categorías, etiquetas de plataforma, atributos | `wp_terms`, `wp_term_taxonomy`, `wp_term_relationships` | 67 términos |
| Pedidos (cliente, dirección, total, estado) | `wp_posts` (tipo `shop_order`) + `wp_postmeta` | — |
| Productos de cada pedido | `wp_woocommerce_order_items` + `…_itemmeta` | — |
| Historial de cada pedido (pagos, stock) | `wp_comments` (tipo `order_note`) | — |
| Carritos de los visitantes | `wp_woocommerce_sessions` | — |
| Páginas (Inicio, etc.) | `wp_posts` (tipo `page`) | 8 |
| Usuarios del panel | `wp_users` | 1 (admin) |
| Ajustes: moneda GTQ, envíos, pagos, clave de Recurrente, URLs del frontend | `wp_options` | ~670 |

**Archivos** (fotos de productos y sus tamaños generados): `wp-content\uploads\` (~400 archivos).

> Los pedidos usan el almacenamiento clásico de WooCommerce (`wp_posts`); las tablas HPOS
> (`wp_wc_orders`) no están activas en este sitio.

### En el frontend (Next.js): nada permanente

El frontend **no tiene base de datos**. Solo guarda copias temporales para responder rápido:

| Qué | Dónde | Cuánto dura |
|---|---|---|
| Catálogo (productos, categorías, variaciones) | Caché de Next.js (`'use cache'`, etiqueta `catalogo`) — en Vercel, su caché de datos | Hasta que WordPress avisa un cambio (máx. días) |
| Páginas de contenido y tipo de cambio | Caché de Next.js | 1 hora |
| Carrito recién modificado | Memoria del servidor, por token | 60 segundos |
| Sesiones de carrito preparadas | Memoria del servidor | 30 minutos |

### En el navegador del cliente

| Cookie | Para qué | Seguridad |
|---|---|---|
| `cart_token` | Identifica su carrito en WooCommerce | `httpOnly`, `SameSite=Lax`, `Secure` en producción, 48 h |
| `cart_count` | Número del contador del carrito | `httpOnly`, 48 h |

### Fuera de la tienda

- **Código:** GitHub (`ipolancol-student/next-level`).
- **Pagos con tarjeta:** Recurrente (los datos de la tarjeta nunca pasan por la tienda).
- **Tipo de cambio:** servicio web del Banco de Guatemala.

## 3. Rendimiento

### Diagnóstico (medido)

| Medición | Resultado |
|---|---|
| Cada llamada a WordPress Studio (PHP en WebAssembly) | **2 a 4 s** (en un hosting normal: 0.1–0.3 s) |
| Studio con 3 llamadas simultáneas | 4.3 s → atiende casi en serie |
| Página ya en caché (producción) | **0.03–0.06 s** |

El cuello de botella es WordPress Studio. Por eso la estrategia es **hacer menos llamadas** a
WordPress y **nunca hacer esperar al cliente** por una llamada evitable.

### Optimizaciones aplicadas

| Optimización | Efecto |
|---|---|
| **Stale-while-revalidate**: al cambiar algo en WordPress, se sirve la versión anterior al instante y se refresca en segundo plano | Página tras un cambio: **5–14 s → 0.05–0.1 s** |
| Caché del catálogo de larga duración (invalidación por eventos, no por tiempo) | El catálogo casi nunca está "frío" |
| **Variaciones en una sola llamada** (`type=variation&parent=`) | 1 llamada en lugar de 2–4 por producto con ediciones o colores |
| **Contador del carrito desde una cookie** | Ninguna página consulta WordPress para el contador |
| **Caché del carrito de 60 s** (se reutiliza la respuesta de WooCommerce al añadir o cambiar) | Carrito → checkout: **~3 s → 0.4 s** |
| **Reserva de sesiones de carrito** (se crean con `after()` después de responder) | Primer "Añadir": **6.6 s → 3.7 s** |
| **Calentamiento de caché** (`npm run calentar`): visita las 103 páginas del sitemap | Ningún visitante encuentra una página fría |
| Imágenes AVIF/WebP con `next/image` | Fotos de pocos KB; se corrigió que en producción local no cargaban |

**La stock real** se sigue validando en WooCommerce al añadir al carrito y al pagar, así que servir
el catálogo desde caché no permite vender algo agotado.

### Antes de una presentación

```bash
cd frontend
npm run build && npm start      # producción (mucho más rápido que npm run dev)
npm run calentar                # en otra terminal: deja las 103 páginas en caché
```
