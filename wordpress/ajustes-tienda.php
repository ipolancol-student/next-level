<?php
/**
 * Ajustes recomendados de WordPress para la tienda headless + páginas legales.
 * Uso: copia este archivo a la carpeta del sitio y ejecuta  studio wp eval-file ajustes-tienda.php
 * Es seguro ejecutarlo varias veces.
 */

if (!defined('ABSPATH') || !class_exists('WooCommerce')) {
    echo "Ejecuta este archivo con: studio wp eval-file ajustes-tienda.php\n";
    return;
}

/* 1. La tienda está "en vivo" (sin modo Próximamente). */
update_option('woocommerce_coming_soon', 'no');

/* 2. El WordPress (backend) no se indexa: el SEO lo hace el frontend en Next.js. */
update_option('blog_public', '0');

/* 3. Sin comentarios ni pingbacks (la tienda no los usa; solo atraen spam). */
update_option('default_comment_status', 'closed');
update_option('default_ping_status', 'closed');

/* 4. Remitente de los correos de pedidos. */
update_option('woocommerce_email_from_name', 'Next Level');

echo "✔ Tienda en vivo, WordPress fuera de buscadores, comentarios cerrados, remitente 'Next Level'\n";

/* 5. Páginas legales. */
function nl_pagina_legal(string $slug, string $titulo, string $contenido, int $id_existente = 0): int
{
    $existente = $id_existente ? get_post($id_existente) : get_page_by_path($slug);
    $datos = [
        'post_type'      => 'page',
        'post_status'    => 'publish',
        'post_name'      => $slug,
        'post_title'     => $titulo,
        'post_content'   => $contenido,
        'comment_status' => 'closed',
    ];
    if ($existente) {
        $datos['ID'] = $existente->ID;
        return (int) wp_update_post($datos);
    }
    return (int) wp_insert_post($datos);
}

$bloque = fn(string $html) => "<!-- wp:paragraph --><p>{$html}</p><!-- /wp:paragraph -->";
$titulo = fn(string $texto) => "<!-- wp:heading --><h2 class=\"wp-block-heading\">{$texto}</h2><!-- /wp:heading -->";
$lista = fn(array $items) => '<!-- wp:list --><ul class="wp-block-list">' . implode('', array_map(fn($i) => "<!-- wp:list-item --><li>{$i}</li><!-- /wp:list-item -->", $items)) . '</ul><!-- /wp:list -->';
$aviso = $bloque('<em>Next Level es un proyecto académico de Seminario de Final de Curso. No es un comercio real: los pedidos son de demostración.</em>');

$privacidad = implode("\n", [
    $aviso,
    $titulo('Qué datos recopilamos'),
    $bloque('Cuando haces un pedido guardamos los datos necesarios para procesarlo y entregarlo:'),
    $lista(['Nombre y apellido.', 'Correo electrónico y teléfono, para avisarte sobre tu pedido.', 'Dirección de envío (dirección, ciudad o municipio, departamento y país).', 'Los productos comprados, el total y el método de pago.']),
    $titulo('Pagos con tarjeta'),
    $bloque('Los pagos con tarjeta se procesan en la página segura de <strong>Recurrente</strong>. Next Level <strong>nunca recibe ni guarda</strong> el número de tu tarjeta ni su código de seguridad.'),
    $titulo('Cookies'),
    $bloque('La tienda usa solo cookies técnicas, necesarias para funcionar:'),
    $lista(['<code>cart_token</code>: identifica tu carrito de compras (48 horas).', '<code>cart_count</code>: guarda cuántos productos tienes en el carrito para mostrar el contador (48 horas).']),
    $bloque('No usamos cookies de publicidad ni de seguimiento de terceros.'),
    $titulo('Para qué usamos tus datos'),
    $bloque('Únicamente para procesar, enviar y darte seguimiento a tu pedido. No vendemos ni compartimos tus datos con terceros, salvo la pasarela de pago y el servicio de mensajería necesarios para completar la compra.'),
    $titulo('Cuánto tiempo los guardamos'),
    $bloque('Los datos de los pedidos se conservan mientras sean necesarios para la garantía y las obligaciones contables. Puedes pedir que se eliminen escribiendo a la tienda.'),
    $titulo('Tus derechos'),
    $bloque('Puedes solicitar en cualquier momento acceder a tus datos, corregirlos o eliminarlos, respondiendo al correo de confirmación de tu pedido.'),
]);

$terminos = implode("\n", [
    $aviso,
    $titulo('Precios y moneda'),
    $bloque('Los precios están en <strong>quetzales (GTQ)</strong>. El equivalente en dólares se muestra solo como referencia, con el tipo de cambio del Banco de Guatemala del día, y puede variar.'),
    $titulo('Productos'),
    $bloque('Todos los productos son <strong>nuevos y sellados</strong>. Las fotos son ilustrativas. La disponibilidad se confirma al momento de pagar: si un producto se agota mientras compras, te avisaremos antes de cobrar.'),
    $titulo('Formas de pago'),
    $lista(['Tarjeta de crédito o débito (Visa y Mastercard) mediante Recurrente.', 'Pago contra entrega (efectivo o tarjeta al recibir).', 'Transferencia bancaria: el pedido se confirma al recibir el depósito.']),
    $titulo('Envíos'),
    $lista(['Envío a domicilio en todo Guatemala: Q35.00.', '<strong>Envío gratis</strong> en compras desde Q500.00.', 'Envíos internacionales: Q350.00.']),
    $titulo('Garantía y devoluciones'),
    $bloque('Los productos tienen <strong>30 días de garantía</strong> contra defectos de fábrica, contados desde la entrega. Para hacerla válida, el producto debe devolverse con su empaque original. Los videojuegos y tarjetas de regalo abiertos o canjeados no tienen devolución, salvo defecto de fábrica.'),
    $titulo('Tarjetas de regalo'),
    $bloque('Las tarjetas de regalo de PlayStation Store, Xbox y Nintendo eShop son para cuentas de Estados Unidos. Una vez entregado o rayado el código, no se aceptan cambios ni devoluciones.'),
    $titulo('Seguimiento de tu pedido'),
    $bloque('Al comprar recibes un enlace privado para consultar el estado de tu pedido. Guárdalo: es la forma de verlo sin crear una cuenta.'),
]);

$id_privacidad = nl_pagina_legal('politica-de-privacidad', 'Política de privacidad', $privacidad, (int) get_option('wp_page_for_privacy_policy'));
update_option('wp_page_for_privacy_policy', $id_privacidad);
$id_terminos = nl_pagina_legal('terminos-y-condiciones', 'Términos y condiciones', $terminos);
update_option('woocommerce_terms_page_id', $id_terminos);

echo "✔ Publicadas: /politica-de-privacidad (#{$id_privacidad}) y /terminos-y-condiciones (#{$id_terminos})\n";
