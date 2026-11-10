<?php
/**
 * Plugin Name: Tienda Headless (Proyecto de Seminario)
 * Description: Convierte WordPress + WooCommerce en un backend headless: redirige la parte pública al frontend en Next.js y oculta la lista de usuarios de la API.
 * Version:     1.0.0
 * Author:      Proyecto de Seminario
 *
 * Cómo instalarlo: copia este archivo en wp-content/mu-plugins/ (crea la carpeta si no existe).
 * Los "mu-plugins" se activan solos y no se pueden desactivar por error desde el panel.
 *
 * Hace lo mismo que el plugin "Headless Mode" del video, más una medida de seguridad
 * que el video menciona: no mostrar el usuario admin en /wp-json/wp/v2/users.
 */

if (!defined('ABSPATH')) {
    exit;
}

/*
 * URL de tu frontend en Next.js. Cámbiala cuando lo publiques en Vercel,
 * o defínela en wp-config.php:  define('TIENDA_FRONTEND_URL', 'https://mi-tienda.vercel.app');
 */
if (!defined('TIENDA_FRONTEND_URL')) {
    define('TIENDA_FRONTEND_URL', 'http://localhost:3000');
}

/**
 * 1. Redirigir la parte pública de WordPress al frontend.
 *    Se dejan pasar: el panel (/wp-admin), el login, la API REST, cron y las
 *    notificaciones de pasarelas de pago (wc-api), que WooCommerce necesita.
 */
add_action('template_redirect', function () {
    if (is_admin() || wp_doing_ajax() || wp_doing_cron() || is_preview()) {
        return;
    }
    if (defined('REST_REQUEST') && REST_REQUEST) {
        return;
    }
    if (isset($_GET['wc-api'])) {
        return;
    }

    $ruta = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '/';

    // Productos y páginas de WordPress tienen su equivalente en el frontend.
    if (function_exists('is_product') && is_product()) {
        $destino = '/producto/' . get_post_field('post_name', get_queried_object_id());
    } elseif (function_exists('is_shop') && is_shop()) {
        $destino = '/tienda';
    } elseif (function_exists('is_cart') && is_cart()) {
        $destino = '/carrito';
    } elseif (function_exists('is_order_received_page') && is_order_received_page()) {
        $destino = '/gracias?pedido=' . absint(get_query_var('order-received'));
    } elseif (is_page() && !is_front_page()) {
        $destino = '/' . get_post_field('post_name', get_queried_object_id());
    } else {
        $destino = '/';
    }

    wp_redirect(untrailingslashit(TIENDA_FRONTEND_URL) . $destino, 302);
    exit;
});

/**
 * 2. Ocultar la lista de usuarios a visitantes anónimos.
 *    Sin esto, cualquiera puede ver tu nombre de usuario admin en /wp-json/wp/v2/users.
 */
add_filter('rest_endpoints', function ($endpoints) {
    if (is_user_logged_in()) {
        return $endpoints;
    }
    unset($endpoints['/wp/v2/users'], $endpoints['/wp/v2/users/(?P<id>[\d]+)']);
    return $endpoints;
});

/**
 * 3. Si el pedido califica para envío gratis, ocultar los envíos de pago.
 *    Sin esto WooCommerce deja elegido el primero de la lista (el de pago) y,
 *    como el frontend no muestra un selector de envío, el cliente pagaría de más.
 */
add_filter('woocommerce_package_rates', function ($tarifas) {
    $gratis = array_filter($tarifas, fn($tarifa) => $tarifa->get_method_id() === 'free_shipping');
    return $gratis ?: $tarifas;
}, 100);

/**
 * 4. Enlace "Ver sitio" del panel → abre el frontend en vez del tema de WordPress.
 */
add_action('admin_bar_menu', function ($barra) {
    $nodo = $barra->get_node('site-name');
    if ($nodo) {
        $nodo->href = TIENDA_FRONTEND_URL;
        $barra->add_node($nodo);
    }
    $ver = $barra->get_node('view-site');
    if ($ver) {
        $ver->href = TIENDA_FRONTEND_URL;
        $barra->add_node($ver);
    }
}, 100);
