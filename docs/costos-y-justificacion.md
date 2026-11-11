# Herramientas, costos y justificación

> Sección pensada para el informe del Seminario.

## Resumen

El proyecto se desarrolló con **costo cero**. Todas las herramientas son software libre o tienen
un plan gratuito suficiente para un proyecto académico, que no procesa dinero real ni tiene
tráfico de producción.

## Herramientas utilizadas

| Capa | Herramienta | Licencia / plan | Costo |
|---|---|---|---|
| Servidor local | WordPress Studio / LocalWP | Gratuito | 0 USD |
| Gestor de contenido (backend) | WordPress | GPL (software libre) | 0 USD |
| Comercio electrónico | WooCommerce | GPL (software libre) | 0 USD |
| API | WooCommerce Store API + WordPress REST API | Incluidas en WooCommerce / WordPress | 0 USD |
| Tipo de cambio Q/US$ | Servicio web del Banco de Guatemala (Banguat) | Público y gratuito | 0 USD |
| SEO | Yoast SEO (versión gratuita) | GPL | 0 USD |
| Frontend | Next.js 16 + React 19 + Tailwind CSS | MIT (software libre) | 0 USD |
| Lenguaje | TypeScript sobre Node.js | Apache 2.0 / MIT | 0 USD |
| Pagos con tarjeta | Recurrente (pasarela guatemalteca), modo sandbox | Sin mensualidad; la prueba no mueve dinero | 0 USD |
| Otros pagos | Contra entrega / Transferencia (WooCommerce) | Incluidos | 0 USD |
| Validación de datos | Zod | MIT | 0 USD |
| Pruebas automáticas | Vitest | MIT | 0 USD |
| Integración continua | GitHub Actions (repositorio público) | Gratuito e ilimitado en repos públicos | 0 USD |
| Hosting del frontend | Vercel, plan Hobby | Gratuito (uso no comercial) | 0 USD |
| URL pública del backend | Cloudflare Tunnel (túnel rápido, sin cuenta) | Gratuito | 0 USD |
| Editor y versiones | VS Code, Git, GitHub | Gratuitos | 0 USD |
| **Total** | | | **0 USD** |

## ¿Por qué WordPress headless?

- **Desacoplamiento:** el frontend no depende de las plantillas PHP de WordPress. Se puede cambiar
  un framework por otro sin tocar los productos ni el contenido. Este mismo proyecto lo
  demuestra: se empezó con Astro (como el video) y se cambió a Next.js sin modificar WordPress.
- **Panel conocido:** el administrador de la tienda usa el panel de WordPress/WooCommerce, que es
  muy usado y fácil de aprender.
- **Rendimiento y escalabilidad:** frontend y backend pueden alojarse y escalarse por separado.
- **Reutilización:** la misma API podría alimentar una app móvil.
- **Desventajas asumidas:** más complejidad (dos proyectos), hay que manejar SEO y rutas en el
  frontend, y más mantenimiento.

## ¿Por qué Recurrente para los pagos con tarjeta?

| Opción | Disponible para comercios en Guatemala | Cobra en quetzales | Modo de prueba gratis | Decisión |
|---|---|---|---|---|
| **Recurrente** | Sí (empresa guatemalteca) | Sí (GTQ y USD) | Sí (claves `sk_test_`, tarjeta 4242…) | **Elegida** |
| Stripe | No acepta comercios de Guatemala | — | — | Descartada |
| PayPal | Sí | No (cobra en USD, comisión internacional) | Sí (sandbox) | Alternativa |
| Pasarelas bancarias (VisaNet, BAC…) | Sí | Sí | Requieren contrato de comercio | Fuera del alcance |

La integración no depende de un plugin de terceros: se programó una pasarela propia de WooCommerce
(`wordpress/nextlevel-recurrente.php`) contra la API pública de Recurrente, con verificación de la
firma de los webhooks (Svix) y confirmación del pago por la API antes de marcar el pedido como pagado.

## ¿Cuándo sí convendría pagar? ¿Era necesario aquí?

| Gasto posible | Precio aproximado | ¿Por qué se pagaría? | ¿Necesario en este proyecto? |
|---|---|---|---|
| Hosting de WordPress | 3–10 USD/mes | Servidor disponible 24/7, copias de seguridad, SSL, soporte | **No.** La demo funciona en local o con Cloudflare Tunnel; Oracle Free sirve si se exige que esté publicado siempre |
| Dominio propio (.com) | 10–15 USD/año | Imagen de marca, confianza del cliente | **No.** Basta con `*.vercel.app` |
| Plugins premium (ACF Pro, Subscriptions…) | 50–300 USD/año | Funciones avanzadas | **No.** Las funciones del proyecto están cubiertas por plugins gratuitos |
| Comisión de la pasarela (Recurrente) | Porcentaje por venta, sin mensualidad | Cobrar con tarjeta en quetzales | **No.** Solo se cobra en ventas reales; el sandbox con tarjetas de prueba es gratis |
| Correo transaccional | 0–15 USD/mes | Que los correos de pedido no lleguen a spam | **No.** Brevo ofrece 300 correos/día gratis si hiciera falta |
| Vercel Pro | 20 USD/mes | Uso comercial, más recursos | **No.** El plan Hobby permite proyectos personales y académicos |

**Conclusión:** en una tienda real en producción sí se justifica pagar hosting confiable, un dominio
y posiblemente un correo transaccional, porque afectan la disponibilidad, la seguridad y la
confianza del cliente. En este proyecto académico no se procesan pagos reales ni hay tráfico de
clientes, así que esas necesidades se cubren con entornos locales, planes gratuitos y modos de
prueba **sin afectar la funcionalidad** que se demuestra.

> Nota: el video de referencia muestra un hosting de pago (DonDominio) porque es publicidad del
> patrocinador, no porque sea un requisito técnico. El propio autor desarrolla primero en local.
