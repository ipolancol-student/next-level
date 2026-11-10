# Next Level — Tienda de videojuegos con WordPress Headless

Proyecto de Seminario de Final de Curso: **Next Level** es una tienda en línea de **videojuegos
físicos y accesorios para consola** (PlayStation, Xbox y Nintendo) en Guatemala.
**WordPress + WooCommerce** es el backend (panel de administración, productos, pedidos) y
**Next.js** es el frontend que ve el cliente. Los dos se comunican por API.

**Precios en quetzales y dólares:** la tienda cobra en quetzales (GTQ) y cada precio muestra su
equivalente en dólares con el **tipo de cambio de referencia del Banco de Guatemala**, que se
consulta automáticamente desde su servicio web gratuito.

Basado en el *Curso WordPress Headless 2025* de midudev (https://youtu.be/145_QaxIy5I), que usa
Astro, con la parte de tienda agregada: WooCommerce, carrito y checkout. El frontend se hizo con
Next.js en lugar de Astro. Que se pueda cambiar de framework sin tocar WordPress es justamente la
ventaja del enfoque headless.

**Costo total: 0 USD.** Ver [docs/costos-y-justificacion.md](docs/costos-y-justificacion.md).

## Arquitectura

```
 Navegador ──► Next.js 16 (App Router) ──► WooCommerce Store API ──► WordPress + WooCommerce ──► Base de datos
               Server Components           /wp-json/wc/store/v1      Panel /wp-admin
               Server Actions              /wp-json/wp/v2 (páginas)  Productos, pedidos, pagos
```

- **Server Components:** las páginas piden los datos a WordPress **desde el servidor**, nunca
  desde el navegador. Así no hay problemas de CORS y la URL de WordPress no queda expuesta.
- **Server Actions:** los formularios (añadir al carrito, actualizar cantidad, confirmar pedido)
  llaman a funciones que corren en el servidor ([`src/lib/acciones.ts`](frontend/src/lib/acciones.ts)).
  No hace falta crear una API propia.
- **Carrito:** usa el `Cart-Token` de la Store API, guardado en una cookie segura (`httpOnly`).
  No hacen falta claves ni plugins de pago.
- **Streaming (Cache Components / Partial Prerendering):** cada página envía primero un
  "esqueleto" estático y luego los datos de WordPress en cuanto llegan (`<Suspense>`).
- **Tipo de cambio (Banguat):** [`src/lib/tipoCambio.ts`](frontend/src/lib/tipoCambio.ts) consulta el
  servicio web SOAP del Banco de Guatemala y lo guarda en caché una hora con `'use cache'` +
  `cacheLife('hours')`. Si Banguat no responde, usa un valor de respaldo (`TIPO_CAMBIO_RESPALDO`).
- **Portadas por plataforma:** el catálogo de prueba no usa carátulas reales (tienen derechos de
  autor). Si un producto no tiene foto, el frontend dibuja una portada con el color de su consola,
  según la etiqueta del producto (PS5, Xbox, Switch, Switch 2, Multiplataforma). Al subir una foto en
  WordPress, se usa la foto.
- La parte pública de WordPress se redirige al frontend con el plugin
  [`wordpress/tienda-headless.php`](wordpress/tienda-headless.php), que además oculta el envío de
  pago cuando el pedido califica para envío gratis.

### Catálogo y envíos

| Categoría | Subcategorías |
|---|---|
| Videojuegos | PlayStation 5, Xbox Series X\|S, Nintendo Switch, Nintendo Switch 2 |
| Accesorios | Controles, Audífonos, Carga y energía, Almacenamiento, Estuches y protección |

Envío a Guatemala Q35, **gratis desde Q500**; envío internacional Q350. Todo se crea con el script
[`wordpress/catalogo-gamer.php`](wordpress/catalogo-gamer.php).

## Estructura

```
Proyecto de Seminario/
├── README.md                      ← este archivo
├── docs/
│   └── costos-y-justificacion.md  ← para el informe: herramientas, costos y por qué
├── wordpress/
│   ├── GUIA-WORDPRESS.md          ← cómo instalar y configurar el backend
│   ├── tienda-headless.php        ← plugin del proyecto (va en wp-content/mu-plugins)
│   └── catalogo-gamer.php         ← configura quetzales, envíos y carga el catálogo de prueba
└── frontend/                      ← la tienda en Next.js
    ├── .env.example               ← copia como .env.local y pon tu WP_URL
    └── src/
        ├── lib/
        │   ├── config.ts          ← nombre de la tienda, país por defecto
        │   ├── woo.ts             ← cliente de la WooCommerce Store API
        │   ├── wordpress.ts       ← páginas de WordPress (como en el video)
        │   ├── tipoCambio.ts      ← tipo de cambio Q/US$ del Banco de Guatemala
        │   └── acciones.ts        ← Server Actions: carrito y checkout
        ├── components/            ← Precio (Q + US$), Portada, TarjetaProducto, FormularioCheckout…
        └── app/
            ├── layout.tsx               → encabezado, pie y contador del carrito
            ├── page.tsx                 → /             portada + destacados
            ├── tienda/page.tsx          → /tienda       catálogo, categorías, búsqueda, paginación
            ├── producto/[slug]/page.tsx → /producto/x   detalle y "Añadir al carrito"
            ├── carrito/page.tsx         → /carrito
            ├── checkout/page.tsx        → /checkout     crea el pedido en WooCommerce
            ├── gracias/page.tsx         → /gracias
            ├── [slug]/page.tsx          → /sobre-nosotros, etc. (páginas de WordPress)
            └── not-found.tsx            → página 404
```

## Puesta en marcha

### 1. Programas necesarios (gratis)

| Programa | Para qué |
|---|---|
| [Node.js 22](https://nodejs.org) | Ejecutar Next.js |
| [WordPress Studio](https://developer.wordpress.com/studio/) o [LocalWP](https://localwp.com/) | WordPress en tu PC |
| [VS Code](https://code.visualstudio.com/) | Editor |
| [Git](https://git-scm.com/) | Control de versiones / subir a GitHub |

### 2. Backend

Sigue [wordpress/GUIA-WORDPRESS.md](wordpress/GUIA-WORDPRESS.md).

### 3. Frontend

```bash
cd frontend
npm install
copy .env.example .env.local      # en Git Bash/Mac/Linux: cp .env.example .env.local
```

Edita `frontend/.env.local` y pon la URL de tu WordPress (por ejemplo `WP_URL=http://localhost:8881`).
Después:

```bash
npm run dev
```

Abre http://localhost:3000.

### 4. Probar una compra

1. `/tienda` → abre un producto → **Añadir al carrito**.
2. `/carrito` → **Finalizar compra**.
3. Llena los datos (país Guatemala, elige el departamento), elige un método de pago →
   **Confirmar pedido**.
4. En WordPress, **WooCommerce → Pedidos**: aparece el pedido nuevo.

## Publicar en internet (opcional, gratis)

- **Frontend → Vercel (plan Hobby):** Vercel es la empresa que crea Next.js, así que no hace falta
  configurar nada. Sube el proyecto a GitHub, impórtalo en vercel.com, pon
  **Root Directory = `frontend`** y agrega la variable de entorno `WP_URL`.
- **Backend:** Vercel necesita que WordPress tenga una URL pública. Opciones gratis:
  - **Cloudflare Tunnel** (`cloudflared tunnel --url http://localhost:8881`): URL pública
    temporal mientras tu PC esté encendida. Ideal para el día de la presentación.
  - **Oracle Cloud Always Free:** una máquina virtual gratis para siempre donde instalar WordPress.
- Después de publicar, cambia `TIENDA_FRONTEND_URL` en `tienda-headless.php`.

## Decisiones técnicas

- **Imágenes con `<img>` y no con `next/image`.** Next.js 16 bloquea por seguridad la
  optimización de imágenes que vienen de `localhost`, y en desarrollo WordPress está en
  `localhost`. Al publicar con un dominio real se puede cambiar a `next/image` configurando
  `images.remotePatterns` en `next.config.ts`.
- **Datos siempre frescos.** Los productos se piden en cada visita (sin caché) para que precio y
  stock estén siempre al día. Una mejora posible es cachear el catálogo con `'use cache'` y
  `cacheLife('minutes')`.

## Limitaciones conocidas

- Solo se venden **productos simples**. Los productos con variaciones (talla/color) se muestran,
  pero no tienen selector de variación.
- Los pagos de la demo son **contra entrega / transferencia**. Para tarjeta con Stripe en modo
  prueba hace falta integrar Stripe.js en el checkout (posible mejora).
- No hay cuentas de cliente (login). Se compra como invitado.
