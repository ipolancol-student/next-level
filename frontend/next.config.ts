import type { NextConfig } from 'next';

const esDesarrollo = process.env.NODE_ENV === 'development';

// Origen de WordPress (de .env.local o de las variables de Vercel).
let wordpress: URL | null = null;
try {
  wordpress = process.env.WP_URL ? new URL(process.env.WP_URL) : null;
} catch {
  wordpress = null;
}
const wordpressLocal = ['localhost', '127.0.0.1', '[::1]'].includes(wordpress?.hostname ?? '');

/**
 * Política de seguridad de contenido (CSP): qué puede cargar el navegador y desde dónde.
 * - Scripts y estilos: solo de esta tienda ('unsafe-inline' lo necesita Next.js para
 *   hidratar la página; 'unsafe-eval' solo en desarrollo para la recarga en caliente).
 * - Imágenes: de esta tienda (next/image) y de WordPress.
 * - Formularios: solo a esta tienda y a la página de pago de Recurrente.
 * - Nadie puede meter la tienda dentro de un <iframe> (evita clickjacking).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esDesarrollo ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${wordpress ? ` ${wordpress.origin}` : ''}`,
  "font-src 'self'",
  `connect-src 'self'${esDesarrollo ? ' ws: wss:' : ''}`,
  "form-action 'self' https://app.recurrente.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'"
].join('; ');

const cabecerasSeguridad = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ...(esDesarrollo ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }])
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // No anunciar "X-Powered-By: Next.js" (no da pistas sobre la tecnología).
  poweredByHeader: false,

  images: {
    // Solo se optimizan fotos subidas a WordPress (no cualquier URL de internet).
    remotePatterns: wordpress
      ? [
          {
            protocol: wordpress.protocol.replace(':', '') as 'http' | 'https',
            hostname: wordpress.hostname,
            port: wordpress.port,
            pathname: '/wp-content/uploads/**'
          }
        ]
      : [],
    formats: ['image/avif', 'image/webp'],
    // Next 16 bloquea por seguridad (SSRF) optimizar imágenes de IPs locales. Se permite solo
    // cuando el propio WordPress está en esta máquina (WordPress Studio en localhost); el
    // riesgo queda acotado porque remotePatterns solo deja pasar /wp-content/uploads de ese host.
    dangerouslyAllowLocalIP: esDesarrollo || wordpressLocal
  },

  async headers() {
    return [{ source: '/:path*', headers: cabecerasSeguridad }];
  },

  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css'
      }
    }
  }
};

export default nextConfig;
