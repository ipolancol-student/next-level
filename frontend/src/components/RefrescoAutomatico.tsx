'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Vuelve a pedir la página al servidor cada N segundos (sin recargar el navegador),
 * hasta un máximo de intentos. Se usa mientras se confirma un pago con tarjeta.
 */
export function RefrescoAutomatico({ cadaSegundos, maximo }: { cadaSegundos: number; maximo: number }) {
  const router = useRouter();

  useEffect(() => {
    let intentos = 0;
    const id = setInterval(() => {
      intentos += 1;
      router.refresh();
      if (intentos >= maximo) clearInterval(id);
    }, cadaSegundos * 1000);
    return () => clearInterval(id);
  }, [router, cadaSegundos, maximo]);

  return null;
}
