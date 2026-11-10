<?php
/**
 * Configura la tienda "Next Level" (Guatemala, quetzales) y carga un catálogo de
 * prueba de videojuegos físicos y accesorios.
 *
 * Uso (desde la carpeta del sitio en WordPress Studio):
 *   1. Copia este archivo a la carpeta del sitio.
 *   2. studio wp eval-file catalogo-gamer.php
 *
 * Es seguro ejecutarlo varias veces: no duplica categorías ni productos (usa el SKU).
 * ATENCIÓN: borra los productos de ejemplo de WooCommerce (gorras, sudaderas, etc.).
 */

if (!defined('ABSPATH') || !class_exists('WooCommerce')) {
    echo "Ejecuta este archivo con: studio wp eval-file catalogo-gamer.php (con WooCommerce activo)\n";
    return;
}

/* ------------------------------------------------------------------ */
/* 1. Tienda en Guatemala, precios en quetzales                        */
/* ------------------------------------------------------------------ */

update_option('blogname', 'Next Level');
update_option('blogdescription', 'Videojuegos físicos y accesorios para consola');
update_option('woocommerce_default_country', 'GT:GT-GU');
update_option('woocommerce_store_city', 'Ciudad de Guatemala');
update_option('woocommerce_currency', 'GTQ');
update_option('woocommerce_currency_pos', 'left');        // Q499.00
update_option('woocommerce_price_thousand_sep', ',');
update_option('woocommerce_price_decimal_sep', '.');
update_option('woocommerce_price_num_decimals', '2');
update_option('woocommerce_manage_stock', 'yes');
echo "✔ Tienda configurada en quetzales (GTQ)\n";

/* ------------------------------------------------------------------ */
/* 2. Envíos: Guatemala Q35 (gratis desde Q500), resto del mundo Q350  */
/* ------------------------------------------------------------------ */

foreach (WC_Shipping_Zones::get_zones() as $datos) {
    $zona = new WC_Shipping_Zone($datos['id']);
    if ($zona->get_zone_name() !== 'Guatemala') {
        $zona->delete();
    }
}

$guatemala = null;
foreach (WC_Shipping_Zones::get_zones() as $datos) {
    if ($datos['zone_name'] === 'Guatemala') {
        $guatemala = new WC_Shipping_Zone($datos['id']);
    }
}
if (!$guatemala) {
    $guatemala = new WC_Shipping_Zone();
    $guatemala->set_zone_name('Guatemala');
    $guatemala->add_location('GT', 'country');
    $guatemala->save();

    $id = $guatemala->add_shipping_method('flat_rate');
    update_option("woocommerce_flat_rate_{$id}_settings", [
        'enabled' => 'yes', 'title' => 'Envío a domicilio', 'tax_status' => 'none', 'cost' => '35',
    ]);
    $id = $guatemala->add_shipping_method('free_shipping');
    update_option("woocommerce_free_shipping_{$id}_settings", [
        'enabled' => 'yes', 'title' => 'Envío gratis (compras desde Q500)', 'requires' => 'min_amount',
        'min_amount' => '500', 'ignore_discounts' => 'no',
    ]);
}

// Zona 0 = "resto del mundo".
$resto = new WC_Shipping_Zone(0);
foreach ($resto->get_shipping_methods() as $metodo) {
    $resto->delete_shipping_method($metodo->get_instance_id());
}
$id = $resto->add_shipping_method('flat_rate');
update_option("woocommerce_flat_rate_{$id}_settings", [
    'enabled' => 'yes', 'title' => 'Envío internacional', 'tax_status' => 'none', 'cost' => '350',
]);
echo "✔ Envíos: Guatemala Q35 (gratis desde Q500), internacional Q350\n";

/* ------------------------------------------------------------------ */
/* 3. Borrar los productos de ejemplo de WooCommerce                    */
/* ------------------------------------------------------------------ */

$slugs_ejemplo = ['accessories', 'clothing', 'decor', 'hoodies', 'music', 'tshirts'];
$ejemplo = wc_get_products(['limit' => -1, 'status' => 'any', 'type' => ['simple', 'variable', 'grouped', 'external']]);
$borrados = 0;
foreach ($ejemplo as $producto) {
    $slugs = wp_get_post_terms($producto->get_id(), 'product_cat', ['fields' => 'slugs']);
    $es_ejemplo = array_intersect($slugs, $slugs_ejemplo) || str_starts_with((string) $producto->get_sku(), 'woo-')
        || in_array($producto->get_sku(), ['wp-pennant', 'logo-collection'], true);
    if (!$es_ejemplo) {
        continue;
    }
    // Imágenes del producto (portada + galería) y de sus variaciones.
    $imagenes = array_merge([$producto->get_image_id()], $producto->get_gallery_image_ids());
    foreach ($producto->get_children() as $hijo_id) {
        $hijo = wc_get_product($hijo_id);
        if ($hijo) {
            $imagenes[] = $hijo->get_image_id();
            $hijo->delete(true);
        }
    }
    foreach (array_filter(array_unique($imagenes)) as $imagen) {
        wp_delete_attachment($imagen, true);
    }
    $producto->delete(true);
    $borrados++;
}
foreach ($slugs_ejemplo as $slug) {
    $termino = get_term_by('slug', $slug, 'product_cat');
    if ($termino) {
        wp_delete_term($termino->term_id, 'product_cat');
    }
}
echo "✔ Productos de ejemplo borrados: {$borrados}\n";

/* ------------------------------------------------------------------ */
/* 4. Categorías                                                        */
/* ------------------------------------------------------------------ */

function nl_categoria($nombre, $slug, $padre = 0, $descripcion = '') {
    $existe = get_term_by('slug', $slug, 'product_cat');
    if ($existe) {
        return (int) $existe->term_id;
    }
    $nuevo = wp_insert_term($nombre, 'product_cat', ['slug' => $slug, 'parent' => $padre, 'description' => $descripcion]);
    return (int) $nuevo['term_id'];
}

$cat = [];
$cat['videojuegos'] = nl_categoria('Videojuegos', 'videojuegos', 0, 'Juegos físicos nuevos y sellados.');
$cat['ps5']     = nl_categoria('PlayStation 5', 'playstation-5', $cat['videojuegos']);
$cat['xbox']    = nl_categoria('Xbox Series X|S', 'xbox-series', $cat['videojuegos']);
$cat['switch']  = nl_categoria('Nintendo Switch', 'nintendo-switch', $cat['videojuegos']);
$cat['switch2'] = nl_categoria('Nintendo Switch 2', 'nintendo-switch-2', $cat['videojuegos']);

$cat['accesorios']  = nl_categoria('Accesorios', 'accesorios', 0, 'Controles, audífonos y más para tu consola.');
$cat['controles']   = nl_categoria('Controles', 'controles', $cat['accesorios']);
$cat['audifonos']   = nl_categoria('Audífonos', 'audifonos', $cat['accesorios']);
$cat['carga']       = nl_categoria('Carga y energía', 'carga-y-energia', $cat['accesorios']);
$cat['memoria']     = nl_categoria('Almacenamiento', 'almacenamiento', $cat['accesorios']);
$cat['estuches']    = nl_categoria('Estuches y protección', 'estuches-y-proteccion', $cat['accesorios']);
echo "✔ Categorías listas\n";

/* ------------------------------------------------------------------ */
/* 5. Productos                                                         */
/* ------------------------------------------------------------------ */
// Etiqueta = plataforma (la usa el frontend para el color de la portada).
// [sku, nombre, categorías, etiqueta, precio, oferta, stock, descripción corta]

$productos = [
    // PlayStation 5
    ['NL-PS5-001', "Marvel's Spider-Man 2 – PS5", ['videojuegos', 'ps5'], 'PS5', 499, 449, 12, 'Peter Parker y Miles Morales unen fuerzas en Nueva York. Edición física para PlayStation 5.'],
    ['NL-PS5-002', 'God of War Ragnarök – PS5', ['videojuegos', 'ps5'], 'PS5', 449, null, 8, 'Kratos y Atreus viajan por los Nueve Reinos. Edición física para PlayStation 5.'],
    ['NL-PS5-003', 'Gran Turismo 7 – PS5', ['videojuegos', 'ps5'], 'PS5', 399, null, 6, 'El simulador de conducción más completo de PlayStation. Edición física.'],
    ['NL-PS5-004', 'Astro Bot – PS5', ['videojuegos', 'ps5'], 'PS5', 479, null, 10, 'Plataformas en 3D que aprovecha todas las funciones del control DualSense. Edición física.'],
    // Xbox
    ['NL-XBX-001', 'Forza Horizon 5 – Xbox Series X|S', ['videojuegos', 'xbox'], 'Xbox', 399, null, 7, 'Carreras de mundo abierto por los paisajes de México. Edición física.'],
    ['NL-XBX-002', 'Halo Infinite – Xbox Series X|S', ['videojuegos', 'xbox'], 'Xbox', 299, 249, 9, 'El Jefe Maestro regresa en la campaña más grande de la saga. Edición física.'],
    ['NL-XBX-003', 'Starfield – Xbox Series X', ['videojuegos', 'xbox'], 'Xbox', 459, null, 4, 'Rol y exploración espacial de Bethesda. Edición física.'],
    // Nintendo Switch
    ['NL-NSW-001', 'Mario Kart 8 Deluxe – Nintendo Switch', ['videojuegos', 'switch'], 'Switch', 459, null, 15, 'Carreras para toda la familia con 48 pistas. Cartucho físico.'],
    ['NL-NSW-002', 'The Legend of Zelda: Tears of the Kingdom – Nintendo Switch', ['videojuegos', 'switch'], 'Switch', 529, null, 5, 'Explora Hyrule por tierra y cielo. Cartucho físico.'],
    ['NL-NSW-003', 'Super Smash Bros. Ultimate – Nintendo Switch', ['videojuegos', 'switch'], 'Switch', 459, 409, 11, 'Más de 80 luchadores en el crossover definitivo. Cartucho físico.'],
    ['NL-NSW-004', 'Animal Crossing: New Horizons – Nintendo Switch', ['videojuegos', 'switch'], 'Switch', 429, null, 0, 'Crea tu propia isla paradisíaca. Cartucho físico.'],
    // Nintendo Switch 2
    ['NL-NS2-001', 'Mario Kart World – Nintendo Switch 2', ['videojuegos', 'switch2'], 'Switch 2', 629, null, 6, 'Carreras en un mundo abierto conectado, exclusivo de Nintendo Switch 2. Cartucho físico.'],
    ['NL-NS2-002', 'Donkey Kong Bananza – Nintendo Switch 2', ['videojuegos', 'switch2'], 'Switch 2', 549, null, 8, 'Aventura 3D de Donkey Kong con escenarios destructibles. Cartucho físico.'],
    // Accesorios
    ['NL-ACC-001', 'Control inalámbrico DualSense – Blanco', ['accesorios', 'controles'], 'PS5', 649, null, 10, 'Control oficial para PS5 con retroalimentación háptica y gatillos adaptativos.'],
    ['NL-ACC-002', 'Control inalámbrico Xbox – Carbon Black', ['accesorios', 'controles'], 'Xbox', 499, 459, 9, 'Control oficial para Xbox Series X|S, Xbox One y PC. Conexión Bluetooth.'],
    ['NL-ACC-003', 'Nintendo Switch Pro Controller', ['accesorios', 'controles'], 'Switch', 599, null, 5, 'Control clásico para Nintendo Switch con hasta 40 horas de batería.'],
    ['NL-ACC-004', 'Audífonos gamer con micrófono', ['accesorios', 'audifonos'], 'Multiplataforma', 349, 299, 20, 'Audífonos con micrófono desmontable y conector de 3.5 mm. Compatibles con PS5, Xbox, Switch y PC.'],
    ['NL-ACC-005', 'Base de carga doble para DualSense', ['accesorios', 'carga'], 'PS5', 229, null, 14, 'Carga dos controles DualSense al mismo tiempo. Incluye cable USB-C.'],
    ['NL-ACC-006', 'Cable USB-C trenzado de 3 m', ['accesorios', 'carga'], 'Multiplataforma', 79, null, 40, 'Cable largo para jugar mientras cargas el control. Compatible con PS5, Xbox y Switch.'],
    ['NL-ACC-007', 'Tarjeta microSD 256 GB para Nintendo Switch', ['accesorios', 'memoria'], 'Switch', 299, null, 18, 'Amplía el almacenamiento de tu Nintendo Switch para guardar más juegos digitales y capturas.'],
    ['NL-ACC-008', 'Estuche rígido de viaje para Nintendo Switch', ['accesorios', 'estuches'], 'Switch', 159, null, 25, 'Protege tu consola y hasta 10 cartuchos. Compatible con Switch y Switch OLED.'],
];

$creados = 0;
foreach ($productos as [$sku, $nombre, $categorias, $plataforma, $precio, $oferta, $stock, $corta]) {
    if (wc_get_product_id_by_sku($sku)) {
        continue;
    }
    $p = new WC_Product_Simple();
    $p->set_name($nombre);
    $p->set_sku($sku);
    $p->set_status('publish');
    $p->set_regular_price((string) $precio);
    if ($oferta) {
        $p->set_sale_price((string) $oferta);
    }
    $p->set_manage_stock(true);
    $p->set_stock_quantity($stock);
    $p->set_short_description("<p>{$corta}</p>");
    $p->set_description(
        "<p>{$corta}</p>"
        . '<h3>¿Por qué comprar en Next Level?</h3>'
        . '<ul><li>Producto nuevo y sellado.</li><li>Envío a todo Guatemala (gratis en compras desde Q500).</li>'
        . '<li>Garantía de 30 días contra defectos de fábrica.</li></ul>'
    );
    $p->set_category_ids(array_map(fn($c) => $cat[$c], $categorias));
    $p->save();

    wp_set_object_terms($p->get_id(), [$plataforma], 'product_tag');
    $creados++;
}
echo "✔ Productos creados: {$creados}\n";

/* ------------------------------------------------------------------ */
/* 6. Página "Inicio" (portada del frontend, editable desde el panel)  */
/* ------------------------------------------------------------------ */

if (!get_page_by_path('inicio')) {
    wp_insert_post([
        'post_type'    => 'page',
        'post_status'  => 'publish',
        'post_name'    => 'inicio',
        'post_title'   => 'Sube al siguiente nivel',
        'post_content' => '<!-- wp:paragraph --><p>Videojuegos físicos y accesorios para PlayStation, Xbox y Nintendo. '
            . 'Envío a todo Guatemala y gratis en compras desde Q500.</p><!-- /wp:paragraph -->',
    ]);
    echo "✔ Página Inicio creada\n";
}

echo "Listo.\n";
