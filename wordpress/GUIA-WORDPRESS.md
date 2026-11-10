# Configurar WordPress + WooCommerce (backend)

Sigue estos pasos **una sola vez**. Todo es gratis.

## 1. Instalar WordPress en tu PC

Usa **WordPress Studio** (el que recomienda midudev en el video) o **LocalWP**:

- WordPress Studio: https://developer.wordpress.com/studio/
- LocalWP: https://localwp.com/

En Studio: botón **"Add site"** → nombre `tienda` → **Add site**. Cuando termine verás algo como
`http://localhost:8881`. En la pestaña **Settings** está la contraseña del usuario `admin`.

Entra al panel: `http://localhost:8881/wp-admin`.

## 2. Ajustes básicos

1. **Ajustes → Generales → Idioma del sitio:** Español.
2. **Ajustes → Enlaces permanentes → "Nombre de la entrada" → Guardar.**
   ⚠️ Es obligatorio: sin esto la API (`/wp-json/...`) no funciona bien (lo explica el video en 25:35).

## 3. Instalar plugins (Plugins → Añadir nuevo)

| Plugin | ¿Obligatorio? | Para qué |
|---|---|---|
| **WooCommerce** | Sí | Productos, carrito, pedidos y la Store API que usa el frontend |
| **Yoast SEO** | Recomendado | Título y descripción SEO de cada página (video, 1:24:08) |
| WPGraphQL | No | El video lo muestra, pero este proyecto usa la REST/Store API |

Al activar WooCommerce, el asistente te pide datos de la tienda: país, moneda, etc. Puedes saltarlo y
configurarlo luego en **WooCommerce → Ajustes**.

## 4. Instalar el plugin del proyecto

1. Abre la carpeta del sitio. En Studio: botón **"Open in… → File explorer"**.
2. Entra a `wp-content/` y crea la carpeta **`mu-plugins`** si no existe.
3. Copia ahí el archivo [`tienda-headless.php`](tienda-headless.php).

Ahora, si visitas `http://localhost:8881`, WordPress te manda al frontend (`http://localhost:3000`).
El panel `/wp-admin` y la API siguen funcionando.

> Cuando publiques el frontend, cambia `TIENDA_FRONTEND_URL` dentro del archivo
> (o defínela en `wp-config.php`).

## 5. Configurar la tienda

1. **WooCommerce → Ajustes → General:** país de la tienda y **moneda**.
2. **WooCommerce → Ajustes → Envío → Añadir zona:** crea una zona (por ejemplo, tu país) con
   **Envío gratuito** o **Tarifa plana**. Sin ninguna zona, el checkout puede fallar con
   *"No hay opciones de envío disponibles"*.
3. **WooCommerce → Ajustes → Pagos:** activa **Contra reembolso** y/o **Transferencia bancaria**.
   Son gratis y sirven para la demo sin cobrar dinero real.
4. **WooCommerce → Ajustes → Avanzado → Funciones** (o *Cuentas y privacidad*): verifica que se
   permitan **pedidos sin cuenta** (es lo predeterminado).

## 6. Cargar el catálogo de la tienda

**Recomendado:** el script [`catalogo-gamer.php`](catalogo-gamer.php) deja la tienda lista para
Guatemala: moneda en quetzales, envíos (Q35, gratis desde Q500, internacional Q350), categorías
de videojuegos y accesorios, 21 productos de prueba y la página "Inicio". Cópialo a la carpeta del
sitio y ejecuta:

```bash
studio wp eval-file catalogo-gamer.php
```

**Alternativa:** cargar los productos de ejemplo de WooCommerce (ropa y accesorios genéricos):

WooCommerce trae productos de prueba:

1. **Herramientas → Importar → WooCommerce products (CSV)** → *Ejecutar el importador*.
2. Elige el archivo `wp-content/plugins/woocommerce/sample-data/sample_products.csv`.
3. Marca *"Actualizar productos existentes"* si te lo pide → **Continuar → Ejecutar el importador**.

O crea los tuyos en **Productos → Añadir nuevo**: nombre, precio, imagen destacada y categoría.

## 7. (Opcional) Página de portada

**Páginas → Añadir:** título **"Inicio"**. El texto que escribas aparece en la portada del frontend
(igual que la página "Bienvenidos a GameHub" del video). Cualquier otra página
(ej. "Sobre nosotros") se verá en `http://localhost:3000/sobre-nosotros`.

## Comprobar que todo funciona

Abre en el navegador:

- `http://localhost:8881/wp-json/wc/store/v1/products` → debe mostrar tus productos en JSON.
- `http://localhost:8881/wp-json/wp/v2/pages?slug=inicio` → tu página de portada.

## Alternativa: hacerlo todo por terminal (Studio CLI)

WordPress Studio trae WP-CLI. Desde la carpeta del sitio (por ejemplo `C:\Users\<tú>\Studio\mi-sitio`)
estos comandos hacen los pasos 2 a 6 sin entrar al panel:

```bash
studio wp rewrite structure '/%postname%/' --hard
studio wp plugin install woocommerce --activate
studio wp language core install es_ES --activate
studio wp language plugin install woocommerce es_ES
studio wp option update woocommerce_coming_soon no
studio wp wc payment_gateway update cod --enabled=true --user=1
studio wp wc payment_gateway update bacs --enabled=true --user=1
studio wp wc shipping_zone_method create 0 --method_id=free_shipping --enabled=true --user=1
studio wp plugin install wordpress-importer --activate
studio wp import wp-content/plugins/woocommerce/sample-data/sample_products.xml --authors=skip
```

Para ver los pedidos que llegan desde el frontend:

```bash
studio wp wc shop_order list --user=1 --fields=id,status,total --format=table
```

> **Nota:** WordPress Studio ejecuta PHP dentro de WebAssembly, así que cada llamada a la API
> tarda 1–3 segundos. Por eso la tienda tarda un poco en cargar en local; en un hosting real
> es mucho más rápido.
