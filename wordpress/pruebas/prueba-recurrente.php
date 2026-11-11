<?php
/**
 * Pruebas de la pasarela Recurrente (sin red).
 * Uso: copia este archivo a la carpeta del sitio y ejecuta
 *   studio wp eval-file prueba-recurrente.php
 */

$fallos = 0;
function comprobar(string $nombre, bool $ok): void
{
    global $fallos;
    echo ($ok ? '✔ ' : '✘ ') . $nombre . "\n";
    $fallos += $ok ? 0 : 1;
}

/* --- Firma Svix: ejemplo oficial de la documentación de Svix --- */
$secreto = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';
$id      = 'msg_p5jXN8AQM9LWM0D4loKWxJek';
$ts      = '1614265330';
$cuerpo  = '{"test": 2432232314}';
$firma   = 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=';

comprobar('acepta la firma del ejemplo oficial de Svix', nextlevel_verificar_svix($secreto, $id, $ts, $firma, $cuerpo, (int) $ts));
comprobar('acepta si viene entre varias firmas', nextlevel_verificar_svix($secreto, $id, $ts, "v1,AAAA $firma", $cuerpo, (int) $ts));
comprobar('rechaza un cuerpo modificado', !nextlevel_verificar_svix($secreto, $id, $ts, $firma, '{"test": 1}', (int) $ts));
comprobar('rechaza otro id de mensaje', !nextlevel_verificar_svix($secreto, 'msg_otro', $ts, $firma, $cuerpo, (int) $ts));
comprobar('rechaza un aviso de hace más de 5 minutos', !nextlevel_verificar_svix($secreto, $id, $ts, $firma, $cuerpo, (int) $ts + 301));
comprobar('rechaza sin secreto configurado', !nextlevel_verificar_svix('', $id, $ts, $firma, $cuerpo, (int) $ts));
comprobar('rechaza versiones de firma desconocidas', !nextlevel_verificar_svix($secreto, $id, $ts, str_replace('v1,', 'v2,', $firma), $cuerpo, (int) $ts));

/* --- Montos --- */
$pedido = new WC_Order();
$pedido->set_total('1199.00');
comprobar('Q1,199.00 → 119900 centavos', NextLevel_Gateway_Recurrente::centavos($pedido) === 119900);
$pedido->set_total('0.29');
comprobar('Q0.29 → 29 centavos (sin errores de redondeo)', NextLevel_Gateway_Recurrente::centavos($pedido) === 29);

/* --- Origen de retorno (redirección abierta) --- */
$principal = nextlevel_frontend_principal();
comprobar('acepta un frontend permitido', nextlevel_frontend_seguro($principal) === $principal);
comprobar('ignora un origen no permitido', nextlevel_frontend_seguro('https://sitio-malicioso.example') === $principal);

echo $fallos ? "\n{$fallos} prueba(s) fallaron\n" : "\nTodas las pruebas pasaron\n";
