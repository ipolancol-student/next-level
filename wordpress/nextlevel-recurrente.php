<?php
/**
 * Plugin Name: Next Level — Pagos con tarjeta (Recurrente)
 * Description: Pasarela de pago de WooCommerce para Recurrente (Guatemala). El cliente paga en la página segura de Recurrente; el pedido se confirma por webhook firmado y por consulta directa a la API.
 * Version:     1.0.0
 * Author:      Proyecto de Seminario
 * Requires PHP: 8.1
 *
 * Instalación: copia este archivo en wp-content/mu-plugins/ junto a tienda-headless.php.
 * Configuración: WooCommerce → Ajustes → Pagos → "Tarjeta de crédito o débito (Recurrente)".
 *   Recomendado para producción: definir las claves en wp-config.php en vez de la base de datos:
 *     define('NEXTLEVEL_RECURRENTE_SECRET_KEY', 'sk_test_...');
 *     define('NEXTLEVEL_RECURRENTE_WEBHOOK_SECRET', 'whsec_...');
 *
 * Flujo:
 *   1. Next.js crea el pedido con la Store API (payment_method = recurrente).
 *   2. process_payment() crea un "checkout" en Recurrente y devuelve su URL → el cliente paga allí.
 *   3. Recurrente devuelve al cliente a {frontend}/pedido/{id}?key=… y avisa por webhook.
 *   4. El pedido se marca pagado SOLO después de confirmar con la API de Recurrente que el
 *      checkout está "paid" y que el monto y la moneda coinciden con el pedido.
 *
 * Documentación de la API: https://docs.recurrente.com
 */

if (!defined('ABSPATH')) {
    exit;
}

const NEXTLEVEL_RECURRENTE_API = 'https://app.recurrente.com/api';

add_action('plugins_loaded', function () {
    if (!class_exists('WC_Payment_Gateway')) {
        return;
    }

    class NextLevel_Gateway_Recurrente extends WC_Payment_Gateway
    {
        public function __construct()
        {
            $this->id                 = 'recurrente';
            $this->method_title       = 'Tarjeta de crédito o débito (Recurrente)';
            $this->method_description = 'Cobros con tarjeta en Guatemala a través de Recurrente. Con una clave sk_test_ el cobro es simulado (tarjeta de prueba 4242 4242 4242 4242).';
            $this->has_fields         = false;
            $this->supports           = ['products'];

            $this->init_form_fields();
            $this->init_settings();
            $this->title       = $this->get_option('title');
            $this->description = $this->get_option('description');
            $this->enabled     = $this->get_option('enabled');

            add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
        }

        public function init_form_fields()
        {
            $this->form_fields = [
                'enabled'        => ['title' => 'Activar', 'type' => 'checkbox', 'label' => 'Aceptar pagos con tarjeta mediante Recurrente', 'default' => 'no'],
                'title'          => ['title' => 'Título', 'type' => 'text', 'default' => 'Tarjeta de crédito o débito'],
                'description'    => ['title' => 'Descripción', 'type' => 'textarea', 'default' => 'Paga con Visa o Mastercard en la página segura de Recurrente.'],
                'secret_key'     => ['title' => 'Clave secreta (sk_test_ / sk_live_)', 'type' => 'password', 'description' => 'Recurrente → Configuración → Llaves API. Se ignora si está definida NEXTLEVEL_RECURRENTE_SECRET_KEY en wp-config.php.'],
                'webhook_secret' => ['title' => 'Secreto del webhook (whsec_)', 'type' => 'password', 'description' => 'URL del webhook: ' . esc_html(rest_url('nextlevel/v1/recurrente/webhook'))],
            ];
        }

        /* ---------- Credenciales ---------- */

        public function clave_secreta(): string
        {
            return defined('NEXTLEVEL_RECURRENTE_SECRET_KEY') ? NEXTLEVEL_RECURRENTE_SECRET_KEY : (string) $this->get_option('secret_key');
        }

        public function secreto_webhook(): string
        {
            return defined('NEXTLEVEL_RECURRENTE_WEBHOOK_SECRET') ? NEXTLEVEL_RECURRENTE_WEBHOOK_SECRET : (string) $this->get_option('webhook_secret');
        }

        public function es_prueba(): bool
        {
            return str_starts_with($this->clave_secreta(), 'sk_test_');
        }

        public function is_available()
        {
            return parent::is_available()
                && preg_match('/^sk_(test|live)_/', $this->clave_secreta())
                && in_array(get_woocommerce_currency(), ['GTQ', 'USD'], true);
        }

        /* ---------- API de Recurrente ---------- */

        /** @return array{0:int,1:array} [código HTTP, cuerpo JSON] */
        public function api(string $metodo, string $ruta, ?array $cuerpo = null, array $cabeceras = []): array
        {
            $respuesta = wp_remote_request(NEXTLEVEL_RECURRENTE_API . $ruta, [
                'method'  => $metodo,
                'timeout' => 20,
                'headers' => array_merge([
                    'X-SECRET-KEY' => $this->clave_secreta(),
                    'Content-Type' => 'application/json',
                    'Accept'       => 'application/json',
                ], $cabeceras),
                'body'    => $cuerpo === null ? null : wp_json_encode($cuerpo),
            ]);
            if (is_wp_error($respuesta)) {
                return [0, ['error' => $respuesta->get_error_message()]];
            }
            return [wp_remote_retrieve_response_code($respuesta), json_decode(wp_remote_retrieve_body($respuesta), true) ?: []];
        }

        /** Monto del pedido en centavos (Recurrente trabaja con enteros, nunca con decimales). */
        public static function centavos(WC_Order $pedido): int
        {
            return (int) round((float) $pedido->get_total() * 100);
        }

        /* ---------- Cobro ---------- */

        public function process_payment($order_id)
        {
            $pedido = wc_get_order($order_id);
            $monto  = self::centavos($pedido);
            $moneda = $pedido->get_currency();

            // Mínimos de Recurrente: Q5.00 o US$1.00
            if ($monto < ($moneda === 'GTQ' ? 500 : 100)) {
                wc_add_notice('El monto mínimo para pagar con tarjeta es Q5.00.', 'error');
                return ['result' => 'failure'];
            }

            // El frontend manda su origen; solo se acepta si está en la lista de frontends permitidos.
            $origen  = nextlevel_frontend_seguro(isset($_POST['nextlevel_origen']) ? wp_unslash($_POST['nextlevel_origen']) : null);
            $retorno = $origen . '/pedido/' . $pedido->get_id() . '?key=' . rawurlencode($pedido->get_order_key());

            [$codigo, $checkout] = $this->api('POST', '/checkouts', [
                'items'       => [[
                    'name'           => sprintf('Pedido #%d · Next Level', $pedido->get_id()),
                    'amount_in_cents' => $monto,
                    'currency'       => $moneda,
                    'quantity'       => 1,
                ]],
                'success_url' => $retorno,
                'cancel_url'  => $retorno . '&cancelado=1',
                'expires_at'  => gmdate('c', time() + 60 * (int) get_option('woocommerce_hold_stock_minutes', 60)),
                'metadata'    => ['pedido_id' => $pedido->get_id(), 'tienda' => 'next-level'],
            ], [
                // Si el cliente reintenta, Recurrente devuelve el mismo checkout (no crea duplicados).
                'Idempotency-Key' => sprintf('nextlevel-pedido-%d-%d', $pedido->get_id(), $monto),
            ]);

            if (!in_array($codigo, [200, 201], true) || empty($checkout['checkout_url'])) {
                $mensaje = match (true) {
                    $codigo === 422 && str_contains(wp_json_encode($checkout), 'unverified') =>
                        'El monto supera el límite de la cuenta de Recurrente sin verificar. Intenta con un monto menor u otro método de pago.',
                    $codigo === 401 => 'La pasarela de pago no está bien configurada (clave inválida).',
                    default        => 'No pudimos iniciar el pago con tarjeta. Intenta de nuevo o elige otro método.',
                };
                $pedido->add_order_note(sprintf('Recurrente rechazó crear el checkout (HTTP %d): %s', $codigo, wp_json_encode($checkout)));
                wc_add_notice($mensaje, 'error');
                return ['result' => 'failure'];
            }

            $pedido->update_meta_data('_recurrente_checkout_id', sanitize_text_field($checkout['id']));
            $pedido->update_meta_data('_recurrente_checkout_url', esc_url_raw($checkout['checkout_url']));
            $pedido->update_status('pending', sprintf(
                'Checkout de Recurrente %s creado (%s). Esperando pago.',
                $checkout['id'],
                $this->es_prueba() ? 'MODO PRUEBA' : 'producción'
            ));
            $pedido->save();

            return ['result' => 'success', 'redirect' => $checkout['checkout_url']];
        }

        /* ---------- Confirmación (reconciliación) ---------- */

        /**
         * Pregunta a Recurrente por el checkout del pedido y actualiza su estado.
         * Es idempotente: llamarla varias veces no cambia nada si el pedido ya está pagado.
         */
        public function reconciliar(WC_Order $pedido): void
        {
            $checkout_id = (string) $pedido->get_meta('_recurrente_checkout_id');
            if (!$checkout_id || !$pedido->needs_payment()) {
                return;
            }

            [$codigo, $checkout] = $this->api('GET', '/checkouts/' . rawurlencode($checkout_id));
            if ($codigo !== 200) {
                return; // se reintentará en la próxima consulta o con el webhook
            }

            $estado = $checkout['status'] ?? '';
            if ($estado === 'paid') {
                // Defensa extra: el monto y la moneda deben coincidir con el pedido.
                $monto_ok  = (int) ($checkout['total_in_cents'] ?? -1) === self::centavos($pedido);
                $moneda_ok = strtoupper((string) ($checkout['currency'] ?? '')) === $pedido->get_currency();
                if (!$monto_ok || !$moneda_ok) {
                    $pedido->update_status('on-hold', sprintf(
                        'ALERTA: Recurrente reporta pago de %s %s pero el pedido es de %s %s. Revisar manualmente.',
                        $checkout['total_in_cents'] ?? '?', $checkout['currency'] ?? '?', self::centavos($pedido), $pedido->get_currency()
                    ));
                    return;
                }
                $tarjeta = $checkout['payment_method']['card'] ?? [];
                $pedido->payment_complete((string) ($checkout['payment']['id'] ?? $checkout_id));
                $pedido->add_order_note(sprintf(
                    'Pago confirmado por Recurrente%s.%s',
                    !empty($tarjeta['last4']) ? sprintf(' (%s •••• %s)', strtoupper($tarjeta['network'] ?? 'tarjeta'), $tarjeta['last4']) : '',
                    empty($checkout['live_mode']) ? ' [MODO PRUEBA: no se movió dinero real]' : ''
                ));
            } elseif ($estado === 'expired') {
                $pedido->update_status('cancelled', 'El checkout de Recurrente expiró sin pago.');
            }
        }
    }

    add_filter('woocommerce_payment_gateways', function ($pasarelas) {
        $pasarelas[] = 'NextLevel_Gateway_Recurrente';
        return $pasarelas;
    });
});

/** Instancia de la pasarela registrada en WooCommerce (o null si WooCommerce no está activo). */
function nextlevel_recurrente(): ?NextLevel_Gateway_Recurrente
{
    if (!function_exists('WC') || !class_exists('NextLevel_Gateway_Recurrente')) {
        return null;
    }
    $pasarelas = WC()->payment_gateways()->payment_gateways();
    return $pasarelas['recurrente'] ?? null;
}

// La API de pedidos (tienda-headless.php) pide confirmar el pago al consultar un pedido pendiente.
add_action('nextlevel_reconciliar_pedido', function (WC_Order $pedido) {
    nextlevel_recurrente()?->reconciliar($pedido);
});

/* ====================================================================== */
/* Webhook: POST /wp-json/nextlevel/v1/recurrente/webhook                 */
/* ====================================================================== */
/*
 * Recurrente firma sus webhooks con Svix:
 *   firma = base64( HMAC-SHA256( base64_decode(secreto sin "whsec_"), "{svix-id}.{svix-timestamp}.{cuerpo}" ) )
 * La cabecera svix-signature puede traer varias firmas: "v1,AAA v1,BBB".
 */

function nextlevel_verificar_svix(string $secreto, string $id, string $timestamp, string $firmas, string $cuerpo, ?int $ahora = null): bool
{
    // Se rechazan avisos de hace más de 5 minutos (protección contra reenvíos).
    if (!$secreto || !$id || !ctype_digit($timestamp) || abs(($ahora ?? time()) - (int) $timestamp) > 300) {
        return false;
    }
    $clave = base64_decode(preg_replace('/^whsec_/', '', $secreto), true);
    if ($clave === false) {
        return false;
    }
    $esperada = base64_encode(hash_hmac('sha256', "{$id}.{$timestamp}.{$cuerpo}", $clave, true));
    foreach (preg_split('/\s+/', trim($firmas)) as $firma) {
        [$version, $valor] = array_pad(explode(',', $firma, 2), 2, '');
        if ($version === 'v1' && hash_equals($esperada, $valor)) {
            return true;
        }
    }
    return false;
}

add_action('rest_api_init', function () {
    register_rest_route('nextlevel/v1', '/recurrente/webhook', [
        'methods'             => 'POST',
        'permission_callback' => '__return_true', // la autorización es la firma Svix
        'callback'            => function (WP_REST_Request $request) {
            $pasarela = nextlevel_recurrente();
            if (!$pasarela) {
                return new WP_REST_Response(['error' => 'Pasarela no disponible'], 503);
            }

            $cuerpo = $request->get_body(); // cuerpo crudo: la firma se calcula sobre él
            $valida = nextlevel_verificar_svix(
                $pasarela->secreto_webhook(),
                (string) $request->get_header('svix-id'),
                (string) $request->get_header('svix-timestamp'),
                (string) $request->get_header('svix-signature'),
                $cuerpo
            );
            if (!$valida) {
                return new WP_REST_Response(['error' => 'Firma inválida'], 401);
            }

            $evento = json_decode($cuerpo, true) ?: [];
            $tipo = (string) ($evento['event_type'] ?? '');
            $checkout_id = (string) ($evento['checkout']['id'] ?? '');

            $pedidos = $checkout_id ? wc_get_orders([
                'limit'      => 1,
                'meta_key'   => '_recurrente_checkout_id',
                'meta_value' => $checkout_id,
            ]) : [];
            $pedido = $pedidos[0] ?? null;
            if (!$pedido) {
                // 200 para que Recurrente no reintente un evento que no es de esta tienda.
                return new WP_REST_Response(['ignorado' => 'checkout desconocido'], 200);
            }

            if (in_array($tipo, ['intent.succeeded', 'payment_intent.succeeded'], true)) {
                // No se confía solo en el aviso: se confirma con la API (monto, moneda y estado).
                $pasarela->reconciliar($pedido);
            } elseif (in_array($tipo, ['intent.failed', 'payment_intent.failed'], true) && $pedido->needs_payment()) {
                $motivo = sanitize_text_field((string) ($evento['failure_reason'] ?? $evento['details']['failure_reason'] ?? 'sin detalle'));
                $pedido->update_status('failed', "Recurrente: pago rechazado ({$motivo}).");
            }

            return new WP_REST_Response(['recibido' => $tipo, 'pedido' => $pedido->get_id()], 200);
        },
    ]);
});
