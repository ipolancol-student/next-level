/**
 * Tipos de la WooCommerce Store API (solo los campos que usa la tienda).
 * Referencia: /wp-json/wc/store/v1
 */

export interface Moneda {
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
}

export interface Imagen {
  id: number;
  src: string;
  thumbnail: string;
  alt: string;
}

export interface Categoria {
  id: number;
  name: string;
  slug: string;
  parent?: number;
  count?: number;
}

export interface Etiqueta {
  id: number;
  name: string;
  slug: string;
}

export interface TerminoAtributo {
  id: number;
  name: string;
  slug: string;
  default: boolean;
}

export interface Atributo {
  id: number;
  name: string;
  taxonomy: string | null;
  has_variations: boolean;
  terms: TerminoAtributo[];
}

/** Referencia a una variación dentro del producto padre. */
export interface VariacionRef {
  id: number;
  attributes: { name: string; value: string }[];
}

export interface Precios extends Moneda {
  price: string;
  regular_price: string;
  sale_price: string;
  price_range: { min_amount: string; max_amount: string } | null;
}

export interface Producto {
  id: number;
  name: string;
  slug: string;
  /** simple | variable | variation | grouped | external */
  type: string;
  parent: number;
  /** En una variación: "Edición: Coleccionista". */
  variation: string;
  short_description: string;
  description: string;
  on_sale: boolean;
  prices: Precios;
  images: Imagen[];
  categories: Categoria[];
  tags: Etiqueta[];
  attributes: Atributo[];
  variations: VariacionRef[];
  is_in_stock: boolean;
  is_purchasable: boolean;
  low_stock_remaining: number | null;
  stock_availability?: { text: string; class: string };
  add_to_cart: { minimum: number; maximum: number };
}

export interface ItemCarrito {
  key: string;
  id: number;
  name: string;
  quantity: number;
  images: Imagen[];
  variation: { attribute: string; value: string }[];
  prices: Moneda & { price: string };
  totals: Moneda & { line_total: string };
}

export interface Carrito {
  items: ItemCarrito[];
  items_count: number;
  needs_shipping: boolean;
  payment_methods: string[];
  totals: Moneda & {
    total_items: string;
    total_shipping: string | null;
    total_tax: string;
    total_price: string;
  };
}

export interface DatosCliente {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_1: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface ResultadoCheckout {
  order_id: number;
  order_key: string;
  status: string;
  payment_method: string;
  payment_result: {
    payment_status: string;
    redirect_url: string;
  };
}

/** Respuesta del endpoint propio /wp-json/nextlevel/v1/pedidos/{id} (ver tienda-headless.php). */
export interface EstadoPedido {
  id: number;
  estado: string;
  pagado: boolean;
  metodo_pago: string;
  metodo_pago_titulo: string;
  moneda: string;
  total: string;
  envio: string;
  fecha: string;
  /** Página de pago de Recurrente, si el pedido aún se puede pagar. */
  url_pago: string;
  items: { nombre: string; cantidad: number; total: string }[];
}
