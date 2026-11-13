<?php
/**
 * Plugin Name: Tienda Headless (Next Level)
 * Description: Convierte WordPress + WooCommerce en el backend headless de la tienda Next.js: redirige el sitio público al frontend, avisa al frontend cuando cambia el catálogo, expone el estado de los pedidos y ajusta la seguridad.
 * Version:     2.0.0
 * Author:      Proyecto de Seminario
 * Requires PHP: 8.1
 *
 * Instalación: copia este archivo en wp-content/mu-plugins/ (los "mu-plugins" se activan
 * solos y no se pueden desactivar por error desde el panel).
 *
 * Configuración (WP-CLI de Studio, desde la carpeta del sitio):
 *   studio wp option update nextlevel_frontend_urls "http://localhost:3000,https://mi-tienda.vercel.app"
 *   studio wp option update nextlevel_revalidate_secret "<el mismo REVALIDATE_SECRET del frontend>"
 * El primer URL de la lista es el principal (redirecciones del sitio público).
 */

if (!defined('ABSPATH')) {
    exit;
}

/* ====================================================================== */
/* Configuración                                                           */
/* ====================================================================== */

/** URLs de los frontends permitidos (sin barra final). El primero es el principal. */
function nextlevel_frontends(): array
{
    $valor = defined('TIENDA_FRONTEND_URL') ? TIENDA_FRONTEND_URL : get_option('nextlevel_frontend_urls', 'http://localhost:3000');
    $urls = array_filter(array_map(fn($u) => untrailingslashit(esc_url_raw(trim($u))), explode(',', (string) $valor)));
    return $urls ?: ['http://localhost:3000'];
}

function nextlevel_frontend_principal(): string
{
    return nextlevel_frontends()[0];
}

/** Devuelve el origen si está en la lista de frontends permitidos; si no, el principal. */
function nextlevel_frontend_seguro(?string $origen): string
{
    $origen = untrailingslashit((string) $origen);
    return in_array($origen, nextlevel_frontends(), true) ? $origen : nextlevel_frontend_principal();
}

function nextlevel_secreto_revalidacion(): string
{
    return defined('NEXTLEVEL_REVALIDATE_SECRET') ? NEXTLEVEL_REVALIDATE_SECRET : (string) get_option('nextlevel_revalidate_secret', '');
}

/* ====================================================================== */
/* 1. Sitio público → frontend                                            */
/* ====================================================================== */
/* Se dejan pasar: el panel, el login, la API REST, cron y wc-api (pasarelas). */

add_action('template_redirect', function () {
    if (is_admin() || wp_doing_ajax() || wp_doing_cron() || is_preview() || (defined('REST_REQUEST') && REST_REQUEST)) {
        return;
    }
    if (isset($_GET['wc-api'])) {
        return;
    }

    if (function_exists('is_product') && is_product()) {
        $destino = '/producto/' . get_post_field('post_name', get_queried_object_id());
    } elseif (function_exists('is_shop') && is_shop()) {
        $destino = '/tienda';
    } elseif (function_exists('is_product_category') && is_product_category()) {
        $destino = '/tienda?categoria=' . get_queried_object()->slug;
    } elseif (function_exists('is_cart') && is_cart()) {
        $destino = '/carrito';
    } elseif (function_exists('is_order_received_page') && is_order_received_page()) {
        $pedido = wc_get_order(absint(get_query_var('order-received')));
        $destino = $pedido ? '/pedido/' . $pedido->get_id() . '?key=' . rawurlencode($pedido->get_order_key()) : '/';
    } elseif (is_page() && !is_front_page()) {
        $destino = '/' . get_post_field('post_name', get_queried_object_id());
    } else {
        $destino = '/';
    }

    wp_redirect(nextlevel_frontend_principal() . $destino, 302);
    exit;
});

/* ====================================================================== */
/* 2. Seguridad                                                            */
/* ====================================================================== */

// Ocultar la lista de usuarios a visitantes anónimos (no revelar el usuario admin).
add_filter('rest_endpoints', function ($endpoints) {
    if (!is_user_logged_in()) {
        unset($endpoints['/wp/v2/users'], $endpoints['/wp/v2/users/(?P<id>[\d]+)']);
    }
    return $endpoints;
});

// XML-RPC no se usa en una tienda headless y es un blanco común de ataques de fuerza bruta.
add_filter('xmlrpc_enabled', '__return_false');

/* ====================================================================== */
/* 3. Dominio público (Cloudflare Tunnel)                                  */
/* ====================================================================== */
/*
 * Cuando WordPress se publica con "cloudflared tunnel", las peticiones llegan con el
 * dominio del túnel (p. ej. https://xxxx.trycloudflare.com). Para que las URLs de las
 * imágenes usen ese dominio y no "localhost", se ajusta home/siteurl SOLO si el dominio
 * es de confianza (evita ataques de cabecera Host falsa).
 */
function nextlevel_host_publico(): ?string
{
    $host = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? ''));
    $host = preg_replace('/:\d+$/', '', $host);
    $permitidos = array_filter(array_map('trim', explode(',', (string) get_option('nextlevel_hosts_publicos', ''))));
    $es_tunel = (bool) preg_match('/^[a-z0-9-]+\.trycloudflare\.com$/', $host);
    return ($es_tunel || in_array($host, $permitidos, true)) ? $host : null;
}

if ($nextlevel_host = nextlevel_host_publico()) {
    $_SERVER['HTTPS'] = 'on'; // el túnel siempre es HTTPS hacia afuera
    $nextlevel_origen = 'https://' . $nextlevel_host;
    add_filter('option_home', fn() => $nextlevel_origen);
    add_filter('option_siteurl', fn() => $nextlevel_origen);

    // WordPress calcula la URL de wp-content ANTES de cargar los plugins (constante
    // WP_CONTENT_URL), así que las fotos seguirían apuntando a localhost: se corrigen aquí.
    $nextlevel_a_publico = fn(string $url) => preg_replace('#^https?://[^/]+#', $nextlevel_origen, $url);
    add_filter('upload_dir', function (array $dirs) use ($nextlevel_a_publico) {
        $dirs['url'] = $nextlevel_a_publico($dirs['url']);
        $dirs['baseurl'] = $nextlevel_a_publico($dirs['baseurl']);
        return $dirs;
    });
    add_filter('content_url', $nextlevel_a_publico);
    add_filter('plugins_url', $nextlevel_a_publico);
}

/* ====================================================================== */
/* 4. Envío gratis                                                         */
/* ====================================================================== */
/* Si el pedido califica para envío gratis, se ocultan los envíos de pago. Sin esto
 * WooCommerce deja elegido el primero (el de Q35) y el frontend no muestra selector. */

add_filter('woocommerce_package_rates', function ($tarifas) {
    $gratis = array_filter($tarifas, fn($tarifa) => $tarifa->get_method_id() === 'free_shipping');
    return $gratis ?: $tarifas;
}, 100);

/* ====================================================================== */
/* 5. Invalidar la caché del frontend cuando cambia el catálogo           */
/* ====================================================================== */
/*
 * Next.js guarda el catálogo en caché. Cuando se guarda un producto, cambia su stock o
 * una categoría, WordPress avisa a POST {frontend}/api/revalidar con una firma HMAC.
 * Los avisos de una misma petición se agrupan y se mandan una sola vez al final.
 */

$GLOBALS['nextlevel_etiquetas_pendientes'] = [];

function nextlevel_invalidar(string $etiqueta): void
{
    $GLOBALS['nextlevel_etiquetas_pendientes'][$etiqueta] = true;
}

foreach ([
    'woocommerce_new_product', 'woocommerce_update_product', 'woocommerce_delete_product', 'woocommerce_trash_product',
    'woocommerce_update_product_variation', 'woocommerce_product_set_stock', 'woocommerce_variation_set_stock',
    'woocommerce_product_set_stock_status', 'woocommerce_variation_set_stock_status',
    'created_product_cat', 'edited_product_cat', 'delete_product_cat',
] as $gancho) {
    add_action($gancho, fn() => nextlevel_invalidar('catalogo'));
}
add_action('save_post_page', fn() => nextlevel_invalidar('paginas'));

add_action('shutdown', function () {
    $etiquetas = array_keys($GLOBALS['nextlevel_etiquetas_pendientes']);
    $secreto = nextlevel_secreto_revalidacion();
    if (!$etiquetas || strlen($secreto) < 16) {
        return;
    }
    $cuerpo = wp_json_encode(['etiquetas' => $etiquetas]);
    $timestamp = (string) time();
    $firma = 'sha256=' . hash_hmac('sha256', "{$timestamp}.{$cuerpo}", $secreto);

    foreach (nextlevel_frontends() as $frontend) {
        wp_remote_post("{$frontend}/api/revalidar", [
            'blocking' => false, // no hace esperar al administrador
            'timeout'  => 3,
            'headers'  => [
                'Content-Type'          => 'application/json',
                'x-nextlevel-timestamp' => $timestamp,
                'x-nextlevel-firma'     => $firma,
            ],
            'body'     => $cuerpo,
        ]);
    }
});

/* ====================================================================== */
/* 6. API propia: estado de un pedido                                      */
/* ====================================================================== */
/*
 * GET /wp-json/nextlevel/v1/pedidos/{id}?key=wc_order_xxx
 * Solo responde con la clave secreta del pedido. Si el pedido está pendiente de pago
 * con tarjeta, primero se confirma con Recurrente (ver nextlevel-recurrente.php).
 */

add_action('rest_api_init', function () {
    register_rest_route('nextlevel/v1', '/pedidos/(?P<id>\d+)', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true', // la autorización es la clave del pedido
        'args'                => [
            'id'  => ['required' => true, 'validate_callback' => fn($v) => ctype_digit((string) $v)],
            'key' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field'],
        ],
        'callback'            => function (WP_REST_Request $request) {
            $pedido = wc_get_order((int) $request['id']);
            // Misma respuesta para "no existe" y "clave incorrecta": no se puede adivinar qué pedidos existen.
            if (!$pedido || !hash_equals($pedido->get_order_key(), (string) $request['key'])) {
                return new WP_Error('nextlevel_pedido_no_encontrado', 'Pedido no encontrado', ['status' => 404]);
            }

            // Reconciliación: si se pagó con tarjeta y sigue pendiente, preguntamos a Recurrente.
            if ($pedido->has_status('pending') && $pedido->get_payment_method() === 'recurrente') {
                do_action('nextlevel_reconciliar_pedido', $pedido);
                $pedido = wc_get_order($pedido->get_id());
            }

            $respuesta = rest_ensure_response([
                'id'                 => $pedido->get_id(),
                'estado'             => $pedido->get_status(),
                'pagado'             => $pedido->is_paid(),
                'metodo_pago'        => $pedido->get_payment_method(),
                'metodo_pago_titulo' => $pedido->get_payment_method_title(),
                'moneda'             => $pedido->get_currency(),
                'total'              => wc_format_decimal($pedido->get_total(), 2),
                'envio'              => wc_format_decimal($pedido->get_shipping_total(), 2),
                'fecha'              => wc_format_datetime($pedido->get_date_created(), 'j \d\e F \d\e Y, H:i'),
                'url_pago'           => $pedido->needs_payment() ? (string) $pedido->get_meta('_recurrente_checkout_url') : '',
                'items'              => array_values(array_map(fn($item) => [
                    'nombre'   => $item->get_name(),
                    'cantidad' => $item->get_quantity(),
                    'total'    => wc_format_decimal($item->get_total(), 2),
                ], $pedido->get_items())),
            ]);
            $respuesta->header('Cache-Control', 'no-store'); // datos personales: nunca en caché
            return $respuesta;
        },
    ]);
});

/* ====================================================================== */
/* 7. Enlace "Ver sitio" del panel → frontend                              */
/* ====================================================================== */

add_action('admin_bar_menu', function ($barra) {
    foreach (['site-name', 'view-site'] as $id) {
        $nodo = $barra->get_node($id);
        if ($nodo) {
            $nodo->href = nextlevel_frontend_principal();
            $barra->add_node($nodo);
        }
    }
}, 100);
