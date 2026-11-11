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
update_option('timezone_string', 'America/Guatemala'); // fechas de pedidos en hora de Guatemala
update_option('date_format', 'j \d\e F \d\e Y');

// Nombres de los métodos de pago como se dicen en Guatemala.
foreach (['cod' => 'Pago contra entrega', 'bacs' => 'Transferencia bancaria'] as $metodo => $titulo) {
    $ajustes = get_option("woocommerce_{$metodo}_settings", []);
    $ajustes['title'] = $titulo;
    update_option("woocommerce_{$metodo}_settings", $ajustes);
}
echo "✔ Tienda configurada en quetzales (GTQ), hora de Guatemala\n";

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

$cat['consolas']        = nl_categoria('Consolas', 'consolas', 0, 'Consolas nuevas con garantía.');
$cat['cons-playstation'] = nl_categoria('Consolas PlayStation', 'consolas-playstation', $cat['consolas']);
$cat['cons-xbox']        = nl_categoria('Consolas Xbox', 'consolas-xbox', $cat['consolas']);
$cat['cons-nintendo']    = nl_categoria('Consolas Nintendo', 'consolas-nintendo', $cat['consolas']);

$cat['tarjetas'] = nl_categoria('Tarjetas de regalo', 'tarjetas-de-regalo', 0, 'Tarjetas físicas para recargar tu cuenta de PlayStation, Xbox o Nintendo.');

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

    // --- Ampliación del catálogo ---
    ['NL-PS5-005', "Ghost of Tsushima Director's Cut – PS5", ['videojuegos', 'ps5'], 'PS5', 429, 379, 9, 'Samurái en la isla de Tsushima, con la expansión Iki incluida. Edición física.'],
    ['NL-PS5-006', 'Ratchet & Clank: Una dimensión aparte – PS5', ['videojuegos', 'ps5'], 'PS5', 349, null, 7, 'Saltos entre dimensiones a toda velocidad gracias al SSD de PS5. Edición física.'],
    ['NL-PS5-007', 'Returnal – PS5', ['videojuegos', 'ps5'], 'PS5', 299, null, 3, 'Roguelike de disparos en un planeta que cambia en cada ciclo. Edición física.'],
    ['NL-XBX-004', 'Diablo IV – Xbox Series X|S', ['videojuegos', 'xbox'], 'Xbox', 449, 389, 6, 'El regreso de Lilith al mundo de Santuario. Rol de acción. Edición física.'],
    ['NL-XBX-005', 'Gears 5 – Xbox One / Series X', ['videojuegos', 'xbox'], 'Xbox', 199, null, 5, 'Acción en tercera persona con campaña cooperativa. Edición física.'],
    ['NL-NSW-005', 'Super Mario Bros. Wonder – Nintendo Switch', ['videojuegos', 'switch'], 'Switch', 459, null, 12, 'Plataformas 2D con la Flor Maravilla que transforma cada nivel. Cartucho físico.'],
    ['NL-NSW-006', 'Pikmin 4 – Nintendo Switch', ['videojuegos', 'switch'], 'Switch', 429, null, 6, 'Estrategia y exploración con los pequeños Pikmin. Cartucho físico.'],
    ['NL-NSW-007', 'Splatoon 3 – Nintendo Switch', ['videojuegos', 'switch'], 'Switch', 429, 379, 8, 'Batallas de tinta en línea 4 contra 4. Cartucho físico.'],
    ['NL-NSW-008', 'Kirby y la tierra olvidada – Nintendo Switch', ['videojuegos', 'switch'], 'Switch', 429, null, 7, 'La primera aventura 3D de Kirby. Cartucho físico.'],
    ['NL-NSW-009', 'Metroid Dread – Nintendo Switch', ['videojuegos', 'switch'], 'Switch', 399, null, 0, 'Samus escapa del planeta ZDR en esta aventura de exploración 2D. Cartucho físico.'],
    ['NL-ACC-009', 'Funda de silicona para DualSense', ['accesorios', 'estuches'], 'PS5', 99, null, 30, 'Mejor agarre y protección contra golpes y rayones para tu control.'],
    ['NL-ACC-010', 'Protector de pantalla de vidrio templado para Switch 2', ['accesorios', 'estuches'], 'Switch 2', 89, null, 35, 'Dureza 9H, incluye 2 unidades y kit de instalación.'],
    ['NL-ACC-011', 'Cargador USB-C de 45 W para Switch y Switch 2', ['accesorios', 'carga'], 'Switch', 189, null, 15, 'Carga rápida en modo portátil y compatible con el modo TV.'],
    ['NL-ACC-012', 'Disco duro externo 2 TB para PS5 y Xbox', ['accesorios', 'memoria'], 'Multiplataforma', 849, 779, 6, 'Guarda y juega títulos de PS4 y Xbox One; respalda tus juegos de nueva generación.'],
    ['NL-ACC-013', 'Batería recargable para control Xbox', ['accesorios', 'carga'], 'Xbox', 179, null, 20, 'Hasta 30 horas de juego por carga. Incluye cable USB-C.'],
    ['NL-ACC-014', 'Volante y pedales para PS5, PS4 y PC', ['accesorios', 'controles'], 'PS5', 2499, 2299, 2, 'Volante con retroalimentación de fuerza para juegos de carreras como Gran Turismo 7.'],

    // --- Ampliación 2: más juegos ---
    ['NL-PS5-008', "Demon's Souls – PS5", ['videojuegos', 'ps5'], 'PS5', 399, 349, 6, 'El clásico de rol y acción reconstruido desde cero para PS5. Edición física.'],
    ['NL-PS5-009', 'Horizon Forbidden West – PS5', ['videojuegos', 'ps5'], 'PS5', 399, null, 8, 'Aloy explora un Oeste prohibido lleno de máquinas colosales. Edición física.'],
    ['NL-PS5-010', 'Stellar Blade – PS5', ['videojuegos', 'ps5'], 'PS5', 499, null, 7, 'Acción con combates ágiles en una Tierra devastada. Edición física.'],
    ["NL-PS5-011", "Marvel's Spider-Man: Miles Morales – PS5", ['videojuegos', 'ps5'], 'PS5', 299, 249, 10, 'Miles Morales protege Harlem con nuevos poderes. Edición física.'],
    ['NL-PS5-012', 'Resident Evil 4 – PS5', ['videojuegos', 'ps5'], 'PS5', 399, null, 9, 'El remake del clásico de terror y acción de Capcom. Edición física.'],
    ['NL-PS5-013', 'Street Fighter 6 – PS5', ['videojuegos', 'ps5'], 'PS5', 349, 299, 6, 'La saga de peleas más icónica con controles modernos y clásicos. Edición física.'],
    ['NL-PS5-014', 'Mortal Kombat 1 – PS5', ['videojuegos', 'ps5'], 'PS5', 449, null, 5, 'Un universo renacido por Liu Kang. Edición física.'],
    ['NL-PS5-015', 'Hogwarts Legacy – PS5', ['videojuegos', 'ps5'], 'PS5', 399, null, 11, 'Vive tu propia historia como estudiante de Hogwarts en el siglo XIX. Edición física.'],
    ['NL-XBX-006', 'Forza Motorsport – Xbox Series X|S', ['videojuegos', 'xbox'], 'Xbox', 449, null, 5, 'Simulación de carreras en circuitos reales con más de 500 autos. Edición física.'],
    ['NL-XBX-007', 'Indiana Jones y el Gran Círculo – Xbox Series X|S', ['videojuegos', 'xbox'], 'Xbox', 529, null, 6, 'Aventura de acción y exploración por todo el mundo con Indiana Jones. Edición física.'],
    ['NL-XBX-008', 'Halo: The Master Chief Collection – Xbox One / Series X', ['videojuegos', 'xbox'], 'Xbox', 249, 199, 8, 'Seis juegos de Halo remasterizados en un solo disco. Edición física.'],
    ['NL-XBX-009', 'Minecraft – Xbox One / Series X', ['videojuegos', 'xbox'], 'Xbox', 199, null, 20, 'Construye, explora y sobrevive en mundos infinitos. Edición física.'],
    ['NL-XBX-010', 'Elden Ring – Xbox Series X|S', ['videojuegos', 'xbox'], 'Xbox', 449, 399, 4, 'Rol de acción en las Tierras Intermedias, de FromSoftware. Edición física.'],
    ['NL-NSW-010', 'The Legend of Zelda: Breath of the Wild – Nintendo Switch', ['videojuegos', 'switch'], 'Switch', 459, null, 9, 'Explora un Hyrule abierto a tu ritmo. Cartucho físico.'],
    ['NL-NSW-011', 'Pokémon Escarlata – Nintendo Switch', ['videojuegos', 'switch'], 'Switch', 459, null, 10, 'Aventura de mundo abierto en la región de Paldea. Cartucho físico.'],
    ['NL-NSW-012', 'Mario Party Superstars – Nintendo Switch', ['videojuegos', 'switch'], 'Switch', 429, 389, 12, '100 minijuegos y 5 tableros clásicos para jugar en familia. Cartucho físico.'],
    ["NL-NSW-013", "Luigi's Mansion 3 – Nintendo Switch", ['videojuegos', 'switch'], 'Switch', 429, null, 7, 'Luigi explora un hotel embrujado para rescatar a sus amigos. Cartucho físico.'],
    ['NL-NSW-014', 'Donkey Kong Country Returns HD – Nintendo Switch', ['videojuegos', 'switch'], 'Switch', 399, null, 8, 'Plataformas 2D clásicas en alta definición. Cartucho físico.'],
    ['NL-NSW-015', 'Minecraft – Nintendo Switch', ['videojuegos', 'switch'], 'Switch', 249, null, 15, 'Construye en cualquier lugar con el modo portátil. Cartucho físico.'],
    ['NL-NS2-003', 'The Legend of Zelda: Breath of the Wild – Nintendo Switch 2 Edition', ['videojuegos', 'switch2'], 'Switch 2', 549, null, 6, 'Mejoras de resolución y rendimiento para Nintendo Switch 2. Cartucho físico.'],
    ['NL-NS2-004', 'Cyberpunk 2077: Ultimate Edition – Nintendo Switch 2', ['videojuegos', 'switch2'], 'Switch 2', 599, 549, 5, 'Night City en modo portátil, con la expansión Phantom Liberty. Cartucho físico.'],

    // --- Ampliación 2: más accesorios ---
    ['NL-ACC-015', 'Pro Controller para Nintendo Switch 2', ['accesorios', 'controles'], 'Switch 2', 699, null, 6, 'Control oficial con botones traseros asignables y conector de audio.'],
    ['NL-ACC-016', 'Control inalámbrico Xbox Elite Series 2', ['accesorios', 'controles'], 'Xbox', 1499, 1399, 3, 'Control profesional con palancas de tensión ajustable y hasta 40 horas de batería.'],
    ['NL-ACC-017', 'Audífonos inalámbricos PULSE Elite para PS5', ['accesorios', 'audifonos'], 'PS5', 1299, null, 4, 'Audio planar de alta fidelidad y micrófono retráctil con cancelación de ruido.'],
    ['NL-ACC-018', 'Audífonos inalámbricos para Xbox', ['accesorios', 'audifonos'], 'Xbox', 899, 799, 5, 'Sonido espacial, conexión inalámbrica y Bluetooth simultáneos.'],
    ['NL-ACC-019', 'Cámara para Nintendo Switch 2', ['accesorios', 'controles'], 'Switch 2', 449, null, 8, 'Videochat con GameChat y juegos compatibles con cámara.'],
    ['NL-ACC-020', 'Tarjeta microSD Express 256 GB para Switch 2', ['accesorios', 'memoria'], 'Switch 2', 599, null, 10, 'Formato microSD Express, el que requiere Nintendo Switch 2 para guardar juegos.'],
    ['NL-ACC-021', 'Estación de carga para 4 Joy-Con', ['accesorios', 'carga'], 'Switch', 199, null, 12, 'Carga hasta cuatro Joy-Con a la vez con indicadores LED.'],
    ['NL-ACC-022', 'Soporte vertical con ventilación para PS5', ['accesorios', 'carga'], 'PS5', 349, 299, 7, 'Mantiene fresca tu consola y carga dos controles DualSense.'],
    ['NL-ACC-023', 'Cable HDMI 2.1 de 2 m (4K 120 Hz)', ['accesorios', 'carga'], 'Multiplataforma', 129, null, 25, 'Aprovecha 4K a 120 Hz en PS5 y Xbox Series X.'],
    ['NL-ACC-024', 'Mochila de viaje para consolas', ['accesorios', 'estuches'], 'Multiplataforma', 449, null, 6, 'Compartimentos acolchados para consola, controles y cables.'],
    ['NL-ACC-025', 'Kit de limpieza para consolas y controles', ['accesorios', 'estuches'], 'Multiplataforma', 89, null, 30, 'Paños de microfibra, cepillos y solución segura para electrónicos.'],
    ['NL-ACC-026', 'Disco SSD M.2 de 2 TB con disipador para PS5', ['accesorios', 'memoria'], 'PS5', 1299, 1199, 5, 'Amplía el almacenamiento interno de tu PS5 con velocidades de hasta 7,000 MB/s.'],

    // --- Consolas sin variaciones ---
    ['NL-CON-003', 'Consola PlayStation 5 Pro (2 TB)', ['consolas', 'cons-playstation'], 'PS5', 6999, null, 3, 'La PlayStation más potente: gráficos mejorados con PSSR, 2 TB de almacenamiento y control DualSense.'],
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
/* 5b. Productos con variaciones (edición / color)                     */
/* ------------------------------------------------------------------ */

/** Crea (si no existe) un atributo global de WooCommerce y sus términos. */
function nl_atributo($nombre, $slug, array $terminos) {
    $taxonomia = wc_attribute_taxonomy_name($slug); // pa_{slug}
    if (!wc_attribute_taxonomy_id_by_name($taxonomia)) {
        wc_create_attribute(['name' => $nombre, 'slug' => $slug, 'type' => 'select', 'order_by' => 'menu_order']);
    }
    // En la misma ejecución la taxonomía aún no está registrada: la registramos a mano.
    if (!taxonomy_exists($taxonomia)) {
        register_taxonomy($taxonomia, ['product', 'product_variation'], ['hierarchical' => false]);
    }
    foreach ($terminos as $termino_slug => $termino_nombre) {
        if (!term_exists($termino_slug, $taxonomia)) {
            wp_insert_term($termino_nombre, $taxonomia, ['slug' => $termino_slug]);
        }
    }
    return $taxonomia;
}

$pa_edicion = nl_atributo('Edición', 'edicion', [
    'estandar' => 'Estándar', 'steelbook' => 'Steelbook', 'coleccionista' => 'Coleccionista',
]);
$pa_color = nl_atributo('Color', 'color', [
    'blanco' => 'Blanco', 'negro' => 'Negro', 'rojo' => 'Rojo', 'azul' => 'Azul', 'morado' => 'Morado',
]);
$pa_modelo = nl_atributo('Modelo', 'modelo', [
    'con-lector-de-discos' => 'Con lector de discos', 'edicion-digital' => 'Edición digital',
    '1-tb-negra' => '1 TB · Negra', '2-tb-galaxy-black' => '2 TB · Galaxy Black', '512-gb-blanca' => '512 GB · Blanca',
    'estandar-switch-2' => 'Estándar', 'bundle-mario-kart-world' => 'Bundle Mario Kart World',
    'oled-blanca' => 'Blanca', 'oled-neon' => 'Neón (rojo/azul)',
]);
$pa_monto = nl_atributo('Monto', 'monto', [
    'us-10' => 'US$10', 'us-20' => 'US$20', 'us-25' => 'US$25', 'us-35' => 'US$35', 'us-50' => 'US$50',
]);
echo "✔ Atributos globales: Edición, Color, Modelo y Monto\n";

// [sku, nombre, categorías, plataforma, taxonomía, descripción, [[término, precio, oferta, stock], ...]]
$variables = [
    ['NL-PS5-V01', 'Final Fantasy VII Rebirth – PS5', ['videojuegos', 'ps5'], 'PS5', $pa_edicion,
        'Segunda parte del remake de Final Fantasy VII. Elige la edición estándar, la de estuche metálico o la de coleccionista exclusiva de Next Level (incluye libro de arte y póster).',
        [['estandar', 499, null, 10], ['steelbook', 579, null, 5], ['coleccionista', 1299, 1199, 2]]],
    ['NL-PS5-V02', 'Elden Ring Nightreign – PS5', ['videojuegos', 'ps5'], 'PS5', $pa_edicion,
        'Acción cooperativa para 3 jugadores en el universo de Elden Ring.',
        [['estandar', 379, null, 8], ['steelbook', 449, null, 4]]],
    ['NL-NS2-V01', 'Pokémon Legends: Z-A – Nintendo Switch 2', ['videojuegos', 'switch2'], 'Switch 2', $pa_edicion,
        'Aventura Pokémon en Ciudad Luminalia. Disponible en edición estándar y coleccionista exclusiva de Next Level.',
        [['estandar', 549, null, 12], ['coleccionista', 999, null, 3]]],
    ['NL-ACC-V01', 'Control inalámbrico DualSense – Colores', ['accesorios', 'controles'], 'PS5', $pa_color,
        'Control oficial para PS5 con retroalimentación háptica y gatillos adaptativos, en varios colores.',
        [['negro', 669, null, 6], ['rojo', 669, 619, 4], ['azul', 669, null, 0], ['morado', 669, null, 3]]],
    ['NL-ACC-V02', 'Joy-Con (L)/(R) para Nintendo Switch', ['accesorios', 'controles'], 'Switch', $pa_color,
        'Par de controles Joy-Con con detección de movimiento y vibración HD.',
        [['rojo', 649, null, 5], ['azul', 649, null, 5], ['morado', 649, 599, 2]]],

    // --- Consolas ---
    ['NL-CON-V01', 'Consola PlayStation 5 Slim', ['consolas', 'cons-playstation'], 'PS5', $pa_modelo,
        'PS5 más delgada con 1 TB de almacenamiento y control DualSense. Elige el modelo con lector de discos o la edición digital.',
        [['con-lector-de-discos', 4799, 4599, 6], ['edicion-digital', 3999, null, 8]]],
    ['NL-CON-V02', 'Consola Xbox Series X', ['consolas', 'cons-xbox'], 'Xbox', $pa_modelo,
        'La Xbox más poderosa, con 4K a 120 FPS y lector de discos.',
        [['1-tb-negra', 4899, null, 5], ['2-tb-galaxy-black', 5999, null, 2]]],
    ['NL-CON-V03', 'Consola Xbox Series S', ['consolas', 'cons-xbox'], 'Xbox', $pa_modelo,
        'Nueva generación totalmente digital en el tamaño más compacto.',
        [['512-gb-blanca', 2799, 2599, 7], ['1-tb-negra', 3299, null, 4]]],
    ['NL-CON-V04', 'Consola Nintendo Switch 2', ['consolas', 'cons-nintendo'], 'Switch 2', $pa_modelo,
        'Pantalla de 7.9" 1080p, Joy-Con 2 magnéticos y compatibilidad con juegos de Switch.',
        [['estandar-switch-2', 3799, null, 6], ['bundle-mario-kart-world', 4199, null, 4]]],
    ['NL-CON-V05', 'Consola Nintendo Switch OLED', ['consolas', 'cons-nintendo'], 'Switch', $pa_modelo,
        'Pantalla OLED de 7", base con puerto LAN y 64 GB de almacenamiento.',
        [['oled-blanca', 2799, null, 5], ['oled-neon', 2799, 2649, 3]]],

    // --- Tarjetas de regalo (cuentas de EE. UU.; precio en quetzales) ---
    ['NL-TAR-V01', 'Tarjeta de regalo PlayStation Store', ['tarjetas'], 'PS5', $pa_monto,
        'Tarjeta física para recargar tu cartera de PlayStation Store (cuentas de EE. UU.). El código viene impreso al reverso.',
        [['us-10', 85, null, 50], ['us-25', 205, null, 50], ['us-50', 405, null, 30]]],
    ['NL-TAR-V02', 'Tarjeta de regalo Xbox', ['tarjetas'], 'Xbox', $pa_monto,
        'Saldo para juegos, Game Pass y contenido en la tienda de Xbox (cuentas de EE. UU.).',
        [['us-10', 85, null, 40], ['us-25', 205, null, 40], ['us-50', 405, null, 25]]],
    ['NL-TAR-V03', 'Tarjeta de regalo Nintendo eShop', ['tarjetas'], 'Switch', $pa_monto,
        'Saldo para comprar juegos digitales en Nintendo eShop (cuentas de EE. UU.).',
        [['us-10', 85, null, 40], ['us-20', 165, null, 40], ['us-35', 285, null, 20], ['us-50', 405, null, 20]]],
];

$creados = 0;
foreach ($variables as [$sku, $nombre, $categorias, $plataforma, $taxonomia, $corta, $opciones]) {
    if (wc_get_product_id_by_sku($sku)) {
        continue;
    }
    $terminos_ids = [];
    foreach ($opciones as [$slug]) {
        $terminos_ids[] = (int) get_term_by('slug', $slug, $taxonomia)->term_id;
    }

    $atributo = new WC_Product_Attribute();
    $atributo->set_id(wc_attribute_taxonomy_id_by_name($taxonomia));
    $atributo->set_name($taxonomia);
    $atributo->set_options($terminos_ids);
    $atributo->set_visible(true);
    $atributo->set_variation(true);

    $padre = new WC_Product_Variable();
    $padre->set_name($nombre);
    $padre->set_sku($sku);
    $padre->set_status('publish');
    $padre->set_short_description("<p>{$corta}</p>");
    $padre->set_description(
        "<p>{$corta}</p>"
        . '<h3>¿Por qué comprar en Next Level?</h3>'
        . '<ul><li>Producto nuevo y sellado.</li><li>Envío a todo Guatemala (gratis en compras desde Q500).</li>'
        . '<li>Garantía de 30 días contra defectos de fábrica.</li></ul>'
    );
    $padre->set_category_ids(array_map(fn($c) => $cat[$c], $categorias));
    $padre->set_attributes([$atributo]);
    $padre->set_default_attributes([$taxonomia => $opciones[0][0]]);
    $padre->save();
    wp_set_object_terms($padre->get_id(), [$plataforma], 'product_tag');
    wp_set_object_terms($padre->get_id(), array_column($opciones, 0), $taxonomia);

    foreach ($opciones as [$slug, $precio, $oferta, $stock]) {
        $variacion = new WC_Product_Variation();
        $variacion->set_parent_id($padre->get_id());
        $variacion->set_attributes([$taxonomia => $slug]);
        $variacion->set_sku("{$sku}-" . strtoupper($slug));
        $variacion->set_regular_price((string) $precio);
        if ($oferta) {
            $variacion->set_sale_price((string) $oferta);
        }
        $variacion->set_manage_stock(true);
        $variacion->set_stock_quantity($stock);
        $variacion->set_status('publish');
        $variacion->save();
    }
    WC_Product_Variable::sync($padre->get_id());
    $creados++;
}
echo "✔ Productos con variaciones creados: {$creados}\n";

/* ------------------------------------------------------------------ */
/* 5c. Pago con tarjeta (Recurrente): activado, falta solo la clave    */
/* ------------------------------------------------------------------ */
// La clave sk_test_/sk_live_ NO se escribe aquí: la pega el administrador en
// WooCommerce → Ajustes → Pagos, o se define en wp-config.php. Sin clave, la
// pasarela no aparece en el checkout (is_available() devuelve false).
$recurrente = get_option('woocommerce_recurrente_settings', []);
$recurrente['enabled'] = 'yes';
$recurrente['title'] ??= 'Tarjeta de crédito o débito';
update_option('woocommerce_recurrente_settings', $recurrente);
echo "✔ Pasarela Recurrente activada (" . (empty($recurrente['secret_key']) ? 'falta pegar la clave' : 'clave configurada') . ")\n";

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
