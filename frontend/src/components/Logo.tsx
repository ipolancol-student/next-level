/** Logotipo de Next Level: un "nivel" ascendente (barras) + nombre en tipografía display. */
export function Logo({ compacto = false }: { compacto?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <defs>
          <linearGradient id="nl-logo" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="var(--color-marca)" />
            <stop offset="1" stopColor="var(--color-neon)" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#nl-logo)" />
        <path d="M8 22h4v-4H8zM14 22h4v-8h-4zM20 22h4V10h-4z" fill="#0b0b14" />
      </svg>
      {!compacto && (
        <span className="font-display text-xl font-bold uppercase leading-none tracking-wide">
          Next<span className="text-neon">Level</span>
        </span>
      )}
    </span>
  );
}
