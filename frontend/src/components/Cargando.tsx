// "Esqueletos" que se ven mientras llegan los datos de WordPress (fallback de Suspense).

export function CuadriculaCargando({ cantidad = 8 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-busy="true" aria-label="Cargando productos">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-borde bg-superficie">
          <div className="aspect-[3/4] bg-superficie-2" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 rounded bg-superficie-2" />
            <div className="h-4 w-3/4 rounded bg-superficie-2" />
            <div className="h-5 w-1/3 rounded bg-superficie-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BloqueCargando({ alto = 'h-64' }: { alto?: string }) {
  return <div className={`${alto} animate-pulse rounded-2xl border border-borde bg-superficie`} aria-busy="true" />;
}
