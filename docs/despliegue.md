# Despliegue: GitHub, Vercel, Cloudflare Tunnel y Recurrente

Todo lo de esta guía es **gratuito**. El orden importa: primero los pagos en local, después GitHub,
luego WordPress público y por último Vercel.

---

## 1. Pagos con tarjeta (Recurrente, modo de prueba)

1. Crea tu cuenta en [recurrente.com](https://recurrente.com).
2. Ve a **Configuración → Llaves API → Abrir Sandbox → Crear mi llave TEST** y copia la clave
   secreta `sk_test_…` ([documentación](https://docs.recurrente.com/guides-english/getting-started/authentication)).
3. En WordPress: **WooCommerce → Ajustes → Pagos → Tarjeta de crédito o débito (Recurrente)**:
   - Activar ✔
   - Clave secreta: pega `sk_test_…`
   - Guardar.

   Para producción es mejor no guardar la clave en la base de datos sino en `wp-config.php`:

   ```php
   define('NEXTLEVEL_RECURRENTE_SECRET_KEY', 'sk_live_...');
   define('NEXTLEVEL_RECURRENTE_WEBHOOK_SECRET', 'whsec_...');
   ```

4. Prueba una compra con la tarjeta `4242 4242 4242 4242`. Al volver a la tienda, la página del
   pedido confirma el pago consultando la API de Recurrente (funciona aunque no haya webhook).

> **Límite de cuentas sin verificar:** Recurrente limita los cobros a Q500 por pago mientras la
> cuenta no esté verificada. La pasarela muestra un mensaje claro si se supera.

### Webhook (cuando WordPress tenga dirección pública)

Con el túnel del paso 3 encendido, registra el webhook en Recurrente (**Configuración → Webhooks**)
con la URL:

```
https://<tu-tunel>.trycloudflare.com/wp-json/nextlevel/v1/recurrente/webhook
```

Suscríbelo a `intent.succeeded` e `intent.failed`, copia el **signing secret** (`whsec_…`) y pégalo
en el campo "Secreto del webhook" de la pasarela.

---

## 2. Repositorio en GitHub

```bash
winget install GitHub.cli
gh auth login            # elige GitHub.com → HTTPS → iniciar sesión con el navegador
gh repo create next-level --public --source . --push
```

La CI (`.github/workflows/ci.yml`) se ejecuta sola en cada push: lint, tipos, pruebas, build y
sintaxis PHP. El estado se ve en la pestaña **Actions** del repositorio.

---

## 3. WordPress público con Cloudflare Tunnel

Vercel está en internet y necesita llegar a tu WordPress. Cloudflare Tunnel lo publica gratis y
sin cuenta mientras tu PC esté encendida:

```bash
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:8881
```

Copia la URL que imprime (`https://xxxx.trycloudflare.com`). El plugin `tienda-headless.php`
reconoce automáticamente los dominios `*.trycloudflare.com` y genera las URLs de las imágenes con
ese dominio.

> La URL **cambia cada vez** que arrancas el túnel. Al cambiarla, actualiza `WP_URL` en Vercel y
> vuelve a desplegar (Vercel → Deployments → Redeploy).

---

## 4. Frontend en Vercel

1. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub → **Add New → Project** →
   importa `next-level`.
2. **Root Directory:** `frontend`.
3. **Environment Variables:**

   | Variable | Valor |
   |---|---|
   | `WP_URL` | la URL del túnel, p. ej. `https://xxxx.trycloudflare.com` |
   | `REVALIDATE_SECRET` | una cadena aleatoria de 32+ caracteres (la misma que en WordPress) |
   | `SITE_URL` | opcional; por defecto usa el dominio de Vercel |

4. **Deploy.** Cada push a `main` vuelve a desplegar.

### Conectar WordPress con el dominio de Vercel

Desde la carpeta del sitio de Studio:

```bash
studio wp option update nextlevel_frontend_urls "https://next-level.vercel.app,http://localhost:3000"
studio wp option update nextlevel_revalidate_secret "<el mismo REVALIDATE_SECRET>"
```

El primer URL es el principal (redirecciones del sitio público y regreso desde Recurrente). Los
demás también se aceptan como destino de regreso y reciben los avisos de caché.

---

## Verificación final

- [ ] La CI está en verde en GitHub.
- [ ] `https://<tu-proyecto>.vercel.app` muestra el catálogo.
- [ ] Una compra con `4242 4242 4242 4242` termina en "¡Pago recibido!" y el pedido aparece como
      **Procesando** en WooCommerce → Pedidos.
- [ ] Cambiar un precio en WordPress se refleja en Vercel en la siguiente visita.
