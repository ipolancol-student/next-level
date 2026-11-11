/**
 * Datos estructurados (schema.org) para que Google entienda la página:
 * precio, moneda, disponibilidad… y pueda mostrar "resultados enriquecidos".
 */
export function JsonLd({ datos }: { datos: Record<string, unknown> }) {
  // Se escapa "<" para que el contenido no pueda cerrar la etiqueta <script>.
  const json = JSON.stringify(datos).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
