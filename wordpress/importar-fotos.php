<?php
/**
 * Importa las fotos de los productos desde una carpeta, emparejándolas por SKU.
 *
 *   NL-PS5-001.jpg      → foto principal del producto con SKU NL-PS5-001
 *   NL-PS5-001-2.jpg    → foto de la galería (también -3, -4…)
 *
 * Uso (WordPress Studio solo ve la carpeta del sitio):
 *   1. Copia las fotos a  wp-content/uploads/importacion-nl/
 *   2. Copia este archivo a la carpeta del sitio y ejecuta:
 *        studio wp eval-file importar-fotos.php
 *
 * Es seguro ejecutarlo varias veces: si una foto ya se importó y no cambió, se omite;
 * si cambió (otro tamaño), reemplaza la anterior que este mismo script había subido.
 * Las fotos subidas a mano desde el panel no se tocan.
 */

if (!defined('ABSPATH') || !class_exists('WooCommerce')) {
    echo "Ejecuta este archivo con: studio wp eval-file importar-fotos.php\n";
    return;
}

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

$carpeta = WP_CONTENT_DIR . '/uploads/importacion-nl';
$archivos = glob($carpeta . '/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', GLOB_BRACE) ?: [];
if (!$archivos) {
    echo "No hay fotos en {$carpeta}\n";
    return;
}
sort($archivos, SORT_NATURAL);

/** Sube una foto (o reutiliza la ya importada si es idéntica) y devuelve el ID del adjunto. */
function nl_importar_foto(string $ruta, int $producto_id, string $alt): int
{
    $nombre = basename($ruta);
    $huella = md5_file($ruta);

    $previos = get_posts([
        'post_type' => 'attachment', 'post_status' => 'inherit', 'numberposts' => -1, 'fields' => 'ids',
        'meta_key' => '_nl_foto_origen', 'meta_value' => $nombre,
    ]);
    foreach ($previos as $previo) {
        if (get_post_meta($previo, '_nl_foto_huella', true) === $huella) {
            return (int) $previo; // misma foto: nada que hacer
        }
        wp_delete_attachment($previo, true); // foto distinta con el mismo nombre: se reemplaza
    }

    // media_handle_sideload mueve el archivo: trabajamos sobre una copia temporal.
    $temporal = wp_tempnam($nombre);
    copy($ruta, $temporal);
    $id = media_handle_sideload(['name' => $nombre, 'tmp_name' => $temporal], $producto_id, $alt);
    if (is_wp_error($id)) {
        @unlink($temporal);
        throw new RuntimeException($id->get_error_message());
    }
    update_post_meta($id, '_nl_foto_origen', $nombre);
    update_post_meta($id, '_nl_foto_huella', $huella);
    update_post_meta($id, '_wp_attachment_image_alt', $alt);
    return (int) $id;
}

// Agrupar por SKU: principal + galería ordenada.
$grupos = [];
$sin_producto = [];
foreach ($archivos as $ruta) {
    $base = pathinfo($ruta, PATHINFO_FILENAME);
    $sku = $base;
    $orden = 1;
    if (!wc_get_product_id_by_sku($sku) && preg_match('/^(.*)-(\d+)$/', $base, $m)) {
        [$sku, $orden] = [$m[1], (int) $m[2]];
    }
    if (!wc_get_product_id_by_sku($sku)) {
        $sin_producto[] = basename($ruta);
        continue;
    }
    $grupos[$sku][$orden] = $ruta;
}

$importados = 0;
$errores = [];
foreach ($grupos as $sku => $fotos) {
    ksort($fotos);
    $producto = wc_get_product(wc_get_product_id_by_sku($sku));
    $alt = html_entity_decode($producto->get_name());
    try {
        $ids = [];
        foreach ($fotos as $ruta) {
            $ids[] = nl_importar_foto($ruta, $producto->get_id(), $alt);
        }
        $producto->set_image_id(array_shift($ids));
        $producto->set_gallery_image_ids($ids);
        $producto->save(); // también avisa al frontend para refrescar la caché del catálogo
        $importados++;
    } catch (Throwable $e) {
        $errores[] = "{$sku}: " . $e->getMessage();
    }
}

echo "✔ Productos con foto actualizada: {$importados}\n";
if ($sin_producto) {
    echo "⚠ Archivos sin producto con ese SKU: " . implode(', ', $sin_producto) . "\n";
}
if ($errores) {
    echo "✘ Errores:\n  " . implode("\n  ", $errores) . "\n";
}
