// Datos generales de la tienda. Cámbialos por los de tu proyecto.
export const TIENDA = {
  nombre: 'Next Level',
  lema: 'Videojuegos físicos y accesorios para consola',
  descripcion:
    'Tienda en línea de videojuegos físicos y accesorios para PlayStation, Xbox y Nintendo en Guatemala. Precios en quetzales y dólares.',
  // Slug de la página de WordPress que se muestra como portada (opcional).
  slugPortada: 'inicio',
  // País que aparece seleccionado en el checkout (código ISO de 2 letras).
  paisPorDefecto: 'GT',
  // Quetzales por 1 US$ que se usan si el Banco de Guatemala no responde.
  // Se puede cambiar sin tocar código con la variable TIPO_CAMBIO_RESPALDO en .env.local.
  tipoCambioRespaldo: Number(process.env.TIPO_CAMBIO_RESPALDO) || 7.7
};
